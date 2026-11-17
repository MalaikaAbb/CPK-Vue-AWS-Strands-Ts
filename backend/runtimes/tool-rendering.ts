import { CopilotRuntime } from "@copilotkit/runtime/v2";

import { toolRenderingAgent } from "../agents";

/**
 * [harness] The runtime behind /generative-ui/tool-rendering, mounted at
 * /api/copilotkit-tool-rendering on the same Node server (as in the
 * aws-strands-py harness: its own runtime path, not a separate server).
 *
 * Tool Rendering's samples use agent `default`, which every other route shares
 * with the Quickstart agent. Here `default` is the tool agent that
 * agent/harness-interrupt.ts serves at /tool-rendering: the Quickstart's model
 * and prompt plus the page's published `getWeather` (with a flagged
 * `getWeatherImpl` stand-in). The three Tool Rendering App.vue files point
 * their runtime-url here (labelled). README §9.3.
 */
export function createToolRenderingRuntime(): CopilotRuntime {
  return new CopilotRuntime({ agents: { default: toolRenderingAgent() } });
}
