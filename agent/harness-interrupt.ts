/**
 * [harness] NOT FROM THE DOCS — the interrupt agent this repo serves
 * (`npx tsx harness-interrupt.ts`), added at the user's request ("Imports +
 * agent, readResume undefined").
 *
 * HITL Overview and useInterrupt publish src/agent/interrupt-agent.ts: the
 * `schedule_meeting` tool only, with no imports and no Agent. Both pages say
 * the showcase mounts a dedicated interrupt agent for the interrupt demos'
 * agent names. The file is kept verbatim; this module supplies the two names it
 * uses but never imports (`tool`, `z`) as globals before loading it, then
 * builds an Agent from the Quickstart's own model and system prompt (main.ts),
 * adding only `tools: [scheduleMeeting]`, and serves it like main.ts does.
 *
 * Not supplied: `readResume` and the `ResumeEnvelope` type, which no page
 * defines. The type is erased at run time; `readResume` stays undefined, so the
 * tool pauses but throws a ReferenceError when the run resumes (README §9).
 *
 * main.ts cannot be imported (it creates and starts its own app), so this is
 * a second process, on INTERRUPT_AGENT_PORT (default 8010).
 *
 * Tool Rendering (added at the user's request, as in the aws-strands-py
 * harness: "a route with tool agent, not a separate server"): the page
 * publishes src/agent/tools.ts with one tool, `getWeather`, and no imports and
 * no Agent. It is kept verbatim at tool-rendering/src/agent/tools.ts and loaded
 * the same way, with the three names it uses: `tool`, `z`, and `getWeatherImpl`.
 * `getWeatherImpl` is defined by no page, so it is a STAND-IN below returning
 * fixed sample weather. The tool agent (Quickstart model and prompt +
 * getWeather) is served at /tool-rendering on this same app (README §9.3).
 */
import { Agent, tool } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { StrandsAgent } from "@ag-ui/aws-strands";
import { addStrandsExpressEndpoint, createStrandsApp } from "@ag-ui/aws-strands/server";
import express from "express";
import { z } from "zod"; // @strands-agents/sdk's own dependency

// [harness] The imports the published file omits — supplied, not edited in.
Object.assign(globalThis, { tool, z });
const { scheduleMeeting } = await import("./src/agent/interrupt-agent.ts");

// [harness] The Quickstart's model and prompt (main.ts), plus the page's tool.
const agent = new Agent({
  model: new OpenAIModel({
    apiKey: process.env.OPENAI_API_KEY ?? "",
    modelId: "gpt-6-luna",
  }),
  systemPrompt: "You are a helpful AI assistant.",
  tools: [scheduleMeeting],
});

await agent.initialize();

const app = await createStrandsApp(
  new StrandsAgent({ agent, name: "strands_agent" }),
  { path: "/" },
);

// ── [harness] Tool Rendering: the published getWeather on /tool-rendering ──
/**
 * [harness] STAND-IN — NOT FROM THE DOCS. The page's getWeather calls
 * getWeatherImpl, which no page publishes. Fixed sample data, no network, so
 * the rendered card has a result to show.
 */
function getWeatherImpl(location: string) {
  return {
    location,
    temperature: 22,
    conditions: "Sunny",
    humidity: 40,
    note: "harness stand-in data",
  };
}

Object.assign(globalThis, { getWeatherImpl });
const { getWeather } = await import("./tool-rendering/src/agent/tools.ts");

// [harness] The Quickstart's model and prompt (main.ts), plus the page's tool.
const toolRenderingAgent = new Agent({
  model: new OpenAIModel({
    apiKey: process.env.OPENAI_API_KEY ?? "",
    modelId: "gpt-6-luna",
  }),
  systemPrompt: "You are a helpful AI assistant.",
  tools: [getWeather],
});

await toolRenderingAgent.initialize();

addStrandsExpressEndpoint(
  app,
  new StrandsAgent({ agent: toolRenderingAgent, name: "strands_agent" }),
  { path: "/tool-rendering", bodyParser: express.json({ limit: "50mb" }) },
);

const port = Number(process.env.INTERRUPT_AGENT_PORT ?? 8010);
app.listen(port, () => {
  console.log(`[harness] Interrupt agent listening on http://localhost:${port}`);
  console.log(`  + /tool-rendering  (Tool Rendering's getWeather)`);
});
