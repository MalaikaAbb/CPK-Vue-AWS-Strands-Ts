# HITL Overview

> Allow your agent and users to collaborate on complex tasks.

## What is this?

Human-in-the-loop (HITL) lets an agent pause mid-run to collect input, confirmation, or a choice from the user, then resume with that answer folded back into its reasoning. It's what turns an autonomous workflow into a collaborative one: the agent keeps its context, the user keeps the steering wheel.

<video
  src="https://cdn.copilotkit.ai/docs/copilotkit/images/coagents/human-in-the-loop-example.mp4"
  className="rounded-lg shadow-xl"
  loop
  playsInline
  controls
  autoPlay
  muted
/>

## When should I use this?

Use HITL when you need:

- **Quality control** — a human gate at high-stakes decision points
- **Edge cases** — graceful fallbacks when the agent's confidence is low
- **Expert input** — lean on the user for domain knowledge the model lacks
- **Reliability** — a more robust loop for real-world, production traffic

## Two patterns for HITL in CopilotKit

<Steps>
  <Step>
    ### Pause a tool with Strands' native interrupt

    AWS Strands ships a first-class
    [interrupt primitive](https://strandsagents.com/docs/user-guide/concepts/interrupts/).
    A tool's callback receives a context whose `interrupt({ name, reason })`
    call halts the agent loop and hands `reason` to the client as the interrupt
    payload. The AG-UI adapter finishes the run with `RUN_FINISHED` carrying
    `outcome.type === "interrupt"`.

    
~~~~typescript title="src/agent/interrupt-agent.ts"
export const scheduleMeeting = tool({
  name: "schedule_meeting",
  description:
    "Ask the user to pick a meeting time, then confirm what was scheduled.",
  inputSchema: z.object({
    topic: z.string().describe("Short description of the meeting purpose."),
    attendee: z.string().optional().describe("Who the meeting is with."),
  }),
  callback: ({ topic, attendee }, context) => {
    // Typed optional by the SDK, so this is checked rather than asserted: with
    // no context there is nothing to pause on, and pretending otherwise would
    // schedule a meeting the user never saw.
    if (!context) {
      throw new Error("schedule_meeting needs a tool context to pause on");
    }

    // `attendee` is optional and the reason has to be JSON, which has no
    // `undefined`, so it is omitted rather than sent as undefined.
    const answer = context.interrupt<ResumeEnvelope>({
      name: "schedule_meeting",
      reason: attendee === undefined ? { topic } : { topic, attendee },
    });

    // Three cancel shapes reach here: each bridge's own sentinel for a
    // cancelled resume entry, and the picker's Cancel button, which resolves
    // with a `cancelled` flag inside the payload.
    const { choice, cancelled } = readResume(answer);
    if (cancelled) {
      return `User cancelled. Meeting NOT scheduled: ${topic}`;
    }

    const label = choice.chosen_label || choice.chosen_time;
    return label
      ? `Meeting scheduled for ${label}: ${topic}`
      : `User did not pick a time. Meeting NOT scheduled: ${topic}`;
  },
});
~~~~


    How the answer reaches the tool depends on the adapter version. The pinned
    `@ag-ui/aws-strands` 0.2.3 hands the client's payload through untouched and
    signals a cancel as `{ status: "cancelled" }`; the Python adapter wraps an
    answer as `{ response: ... }` and cancels with `{ cancelled: true }`. Read
    both shapes, or a picked slot comes back to the model as though the user
    never picked one.

  </Step>
  <Step>
    ### Keep the pausing tool off a client-executed name

    `useHumanInTheLoop` registers its tool on the FRONTEND, so a name used
    there cannot also be a pausing backend tool. This showcase mounts a
    dedicated interrupt agent and points the interrupt demos' agent names at
    it, leaving `schedule_meeting` on the shared agent free for the
    frontend-tool flow.

  </Step>
  <Step>
    ### Resume in the same process, or across a restart

    Pause and resume on the same running process need no extra wiring. For a
    resume that survives a restart, give the agent a Strands `SessionManager`
    through `StrandsAgentConfig.sessionManagerProvider`; the adapter persists
    its interrupt checkpoint into that session.

  </Step>
</Steps>

CopilotKit ships two complementary ways to pause an agent turn and ask the human something. They look similar from the outside (the chat pauses, a custom component appears, the user answers, the run resumes), but they're wired differently on the backend, and each has its own niche.

| Pattern | Who decides to pause? | Backend surface |
| --- | --- | --- |
| `useHumanInTheLoop` | The **LLM**, by calling a registered client-side tool | A frontend-only tool description (Zod schema + `render`) |
| `useInterrupt` | The **graph**, by calling `interrupt(...)` during a node | A server-side `interrupt()` call in your agent |

**Pick `useHumanInTheLoop`** when the pause is an _agent-initiated_ decision — the model chose to ask the user — and you want the picker UI inlined into the normal tool-call flow.

**Pick `useInterrupt`** when the pause is a _graph-enforced_ checkpoint — the code path deterministically requires a human answer — and you want the runtime interrupt as the server-side contract.

## Pattern 1 — `useHumanInTheLoop` (tool-based)

The app registers a HITL tool on the client with `useHumanInTheLoop`. When the LLM calls that tool, CopilotKit renders your Vue component and gives it a `respond` callback during the executing phase. The agent sees the answer as the tool result and continues from there.

```vue title="src/components/MeetingApproval.vue"
<script setup lang="ts">
import { z } from "zod";
import { useHumanInTheLoop } from "@copilotkit/vue/v2";
import TimePickerCard from "./TimePickerCard.vue";

useHumanInTheLoop({
  name: "schedule_meeting",
  description: "Ask the user to select a meeting time.",
  parameters: z.object({
    topic: z.string(),
    attendee: z.string(),
  }),
  render: TimePickerCard,
});
</script>

<template><p>Meeting approval tool registered.</p></template>
```

The picker UI can use static candidate slots, live availability, a calendar API, or any other application data. Mount the registration component beneath `CopilotKitProvider` so the composable can reach the runtime.

## Pattern 2 — `useInterrupt` (graph-paused)

With a runtime interrupt, the pause is enforced by the graph itself: a node interrupts with a serializable payload, the run suspends, the client receives the payload, renders a UI, and resumes the run with the user's answer. CopilotKit's `useInterrupt` composable and `CopilotChat`'s `#interrupt` slot form the Vue render contract.

See the [`useInterrupt` deep dive](/vue/strands-typescript/vue/human-in-the-loop/useInterrupt) for the full walkthrough, including the backend contract and Vue slot wiring.

## Going headless

Both patterns above can drive custom UI. For runtime interrupts, set `renderInChat: false` and use the reactive state returned by `useInterrupt`; for a frontend-tool pause, let the Promise-returning HITL tool drive application state. See the [headless interrupts guide](/vue/strands-typescript/vue/human-in-the-loop/headless) for the interrupt path.

<IntegrationGrid path="human-in-the-loop" />
