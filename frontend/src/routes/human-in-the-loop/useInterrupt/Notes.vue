<script setup lang="ts">
import Callout from "@/components/harness/Callout.vue";
import Panel from "@/components/harness/Panel.vue";
import PublishedCode from "@/components/harness/PublishedCode.vue";
import RouteHeader from "@/components/harness/RouteHeader.vue";
import SourceCode from "@/components/harness/SourceCode.vue";
import TryIt from "@/components/harness/TryIt.vue";
const D = "frontend/src/routes/human-in-the-loop/useInterrupt/demo-chat";
</script>

<template>
  <RouteHeader path="/human-in-the-loop/useInterrupt" />
  <Panel title="What it demonstrates">
    <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <code>MeetingChat.vue</code> renders a pending interrupt in <code>CopilotChat</code>'s <code>#interrupt</code> slot (agent
      <code>gen-ui-interrupt</code>), with buttons that <code>resolve</code> it; <code>ApprovalPanel.vue</code> renders the same state
      outside the transcript with <code>renderInChat: false</code>.
    </p>
    <div class="mt-4">
      <TryIt :prompts="['Schedule a meeting about Q3 planning']" expect="“Pick a time for …” with Tomorrow at 09:00 / Cancel. Resolving resumes the run, which then fails: the tool calls readResume, which no page defines." fail="A normal reply and no picker — check harness-interrupt.ts is running on :8010. After a pick, a RUN_ERROR “readResume is not defined” is the expected doc gap, not a setup problem." />
    </div>
  </Panel>
  <Panel title="Published files, mounted verbatim">
    <div class="space-y-4">
      <SourceCode :file="`${D}/components/MeetingChat.vue`" />
      <SourceCode :file="`${D}/components/ApprovalPanel.vue`" />
      <SourceCode :file="`${D}/App.vue`" />
    </div>
  </Panel>
  <Panel title="Published, not mounted">
    <div class="space-y-4">
      <PublishedCode page="human-in-the-loop__useInterrupt" :index="2" note="Fragment: two enabled-gated registrations with no component around them." />
      <PublishedCode page="human-in-the-loop__useInterrupt" :index="3" note="Fragment: lookupUserDepartment is never defined." />
      <PublishedCode page="human-in-the-loop__useInterrupt" :index="6" note="Fragment: reads slotProps from a call it does not print." />
    </div>
  </Panel>
  <Callout tone="info" title="The backend (README §9.5)">
    <p>The page publishes <code>interrupt-agent.ts</code>: a <code>schedule_meeting</code> tool whose callback calls <code>context.interrupt({ name, reason })</code>, then passes the answer to <code>readResume(answer)</code> — a function no page defines. So the pause works, and resuming throws <code>ReferenceError: readResume is not defined</code> inside the tool (left undefined, by your rule). The page also says the showcase mounts a dedicated interrupt agent for the interrupt demos' agent names, keeping <code>schedule_meeting</code> on the shared agent free for the frontend-tool flow.</p>
  </Callout>
  <Callout tone="harness" title="Agent id"><p><code>gen-ui-interrupt</code> → the interrupt agent on :8010 (<code>backend/agents.ts</code> → <code>agent/harness-interrupt.ts</code>). The page publishes <code>MeetingChat.vue</code>, so no stand-in is needed.</p></Callout>
  <Panel title="The page's backend — interrupt-agent.ts (verbatim)"><SourceCode file="agent/src/agent/interrupt-agent.ts" note="Published on HITL Overview and useInterrupt: the schedule_meeting tool only — no imports (tool, z), no Agent, and it calls readResume and names a ResumeEnvelope type that no page defines." /></Panel>
  <Panel title="Harness — agent/harness-interrupt.ts (flagged, at your request: “Imports + agent, readResume undefined”)"><SourceCode file="agent/harness-interrupt.ts" note="Supplies tool and z as globals, loads the verbatim file, builds an Agent from the Quickstart's model and prompt plus tools: [scheduleMeeting], and serves it on :8010 (a second process: main.ts starts its own app and exports nothing)." /></Panel>
</template>
