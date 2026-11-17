import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { StrandsAgent } from "@ag-ui/aws-strands";
import { createStrandsApp } from "@ag-ui/aws-strands/server";

// Setup your Strands agent
const model = new OpenAIModel({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  modelId: "gpt-6-luna",
});

const agent = new Agent({
  model,
  systemPrompt: "You are a helpful AI assistant.",
});

await agent.initialize();

// Wrap with AG-UI integration
const aguiAgent = new StrandsAgent({
  agent,
  name: "strands_agent",
});

// Create the Express app
const app = await createStrandsApp(aguiAgent, { path: "/" });

app.listen(8000, () => {
  console.log("Agent listening on http://localhost:8000");
});
