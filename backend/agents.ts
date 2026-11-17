import { HttpAgent } from "@ag-ui/client";

/**
 * Agents for every runtime in this repo.
 *
 * `myAgent()` is the agent the Strands landing page registers
 * (https://docs.copilotkit.ai/vue/strands — its only code block), verbatim:
 * an AG-UI HttpAgent pointed at AGENT_URL, where the Strands TypeScript
 * Quickstart's Express app (agent/main.ts: StrandsAgent + createStrandsApp)
 * serves the agent.
 *
 * [harness] Doc agent ids. The landing page registers only `my_agent`, while
 * the Vue samples use `default` (no agent-id) and ids no page registers. Every
 * id is the landing page's my_agent, unchanged, except the two interrupt ids:
 * HITL Overview and useInterrupt publish interrupt-agent.ts and say the
 * showcase "points the interrupt demos' agent names at" a dedicated interrupt
 * agent. That agent is served by agent/harness-interrupt.ts on its own port
 * (flagged, at the user's request: "Imports + agent, readResume undefined").
 * Tool Rendering's published `getWeather` is served at /tool-rendering on that
 * same harness agent server, reached through its own runtime path
 * (toolRenderingAgent, runtimes/tool-rendering.ts). The Sub-agents files
 * (src/agent/state.ts, tools.ts) build no agent and are not served.
 */
export function myAgent() {
  // Verbatim from the landing page's runtime route.
  return new HttpAgent({ url: process.env.AGENT_URL! });
}

/** [harness] The landing page's HttpAgent, pointed at agent/harness-interrupt.ts. */
export function interruptAgent() {
  return new HttpAgent({ url: process.env.INTERRUPT_AGENT_URL ?? "http://localhost:8010/" });
}

/** [harness] The landing page's HttpAgent, pointed at harness-interrupt.ts's /tool-rendering (Tool Rendering's getWeather agent). */
export function toolRenderingAgent() {
  return new HttpAgent({
    url: new URL("tool-rendering", process.env.INTERRUPT_AGENT_URL ?? "http://localhost:8010/").toString(),
  });
}

/** Doc agent ids that run the interrupt agent (the interrupt demos). */
const INTERRUPT_IDS = new Set(["gen-ui-interrupt", "interrupt-headless"]);

/** Doc agent ids, and the page each one comes from. */
export const DOC_AGENT_IDS = {
  default: "no agent-id: Quickstart, Slots, Frontend Tools, Components as Tools, Tool Rendering, …",
  "my-agent": "Prebuilt Components, Headless UI, Headless Threads",
  sales: "Programmatic Control",
  support: "Threads Drawer",
  "gen-ui-interrupt": "Pausing the Agent for Input (MeetingChat.vue)",
  "interrupt-headless": "Headless Interrupts",
  researcher: "State Rendering",
  workspace: "Shared State",
  writer: "State Streaming",
} as const;

export function docAgents() {
  return Object.fromEntries(
    Object.keys(DOC_AGENT_IDS).map((id) => [id, INTERRUPT_IDS.has(id) ? interruptAgent() : myAgent()]),
  );
}
