<script setup lang="ts">
import Callout from "@/components/harness/Callout.vue";
import Panel from "@/components/harness/Panel.vue";
import PublishedCode from "@/components/harness/PublishedCode.vue";
import RouteHeader from "@/components/harness/RouteHeader.vue";
import SourceCode from "@/components/harness/SourceCode.vue";
import TryIt from "@/components/harness/TryIt.vue";
const D = "frontend/src/routes/generative-ui/tool-rendering/demo-chat";
</script>

<template>
  <RouteHeader path="/generative-ui/tool-rendering" />
  <Panel title="What it demonstrates">
    <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      Three ways to draw a tool call — the built-in <code>*</code> renderer, a custom catch-all, and a per-tool <code>useRenderTool</code> for
      <code>get_weather</code>.
    </p>
    <div class="mt-4">
      <TryIt :prompts="['What is the weather in Tokyo?']" expect="Zero-config: a get_weather status card that ends “Done”. Per-tool: the JSON result under an empty heading (the card reads parameters.city, but the tool's argument is location — doc bug). Catch-all: the BrandedToolCard stand-in with the result." fail="Connection refused / RUN_ERROR naming :8010/tool-rendering: agent/harness-interrupt.ts isn't running. A prose answer with no card: the model skipped the tool." />
    </div>
  </Panel>
  <Panel title="Published files, mounted verbatim">
    <div class="space-y-4">
      <SourceCode :file="`${D}/default/components/AgentExperience.vue`" />
      <SourceCode :file="`${D}/per-tool/components/WeatherToolCard.vue`" />
      <SourceCode :file="`${D}/per-tool/components/AgentExperience.vue`" />
      <SourceCode :file="`${D}/per-tool/App.vue`" note="The same published App.vue is copied into each variant directory." />
    </div>
  </Panel>
  <Panel title="Custom catch-all" description="The page prints only one line for this file.">
    <div class="space-y-4">
      <PublishedCode page="generative-ui__tool-rendering" :index="1" />
      <SourceCode :file="`${D}/catch-all/components/AgentExperience.vue`" />
      <SourceCode :file="`${D}/catch-all/components/BrandedToolCard.vue`" />
    </div>
  </Panel>
  <Panel title="The page's backend, as published"><SourceCode file="agent/tool-rendering/src/agent/tools.ts" note="src/agent/tools.ts as this page prints it: one tool, no imports (tool, z), and no agent. Written to agent/tool-rendering/ because the Sub-agents page prints a different file at the same path." /></Panel>
  <Callout tone="info" title="Agent: the page's getWeather on /tool-rendering (README §9.3)">
    <p>The page publishes <code>getWeather</code> with no imports and no agent, and its callback calls <code>getWeatherImpl</code>, which no page defines. <code>agent/harness-interrupt.ts</code> loads the file unchanged with <code>tool</code>, <code>z</code> and a flagged <code>getWeatherImpl</code> stand-in (fixed sample weather) as globals, and serves a tool agent (Quickstart model and prompt + <code>getWeather</code>) at <code>/tool-rendering</code> on its own server. The three samples reach it through their own runtime path, <code>/api/copilotkit-tool-rendering</code> (its <code>default</code> is that agent), so every other route keeps the Quickstart agent. Checked on 2026-11-17 with a fake key and a local stand-in model: the tool ran and its result reached the model. Not yet driven against a live model.</p>
  </Callout>
  <Callout tone="harness" title="What the harness added">
    <p>· The catch-all <code>AgentExperience.vue</code> wraps the published line; <code>BrandedToolCard</code> is a stand-in — never published.</p>
    <p>· <code>getWeatherImpl</code> in <code>agent/harness-interrupt.ts</code> is a stand-in — never published.</p>
    <p>· The three <code>App.vue</code> files use <code>runtime-url="/api/copilotkit-tool-rendering"</code> (the published value is kept as a comment); <code>backend/runtimes/tool-rendering.ts</code> serves it from the same Node server.</p>
  </Callout>
</template>
