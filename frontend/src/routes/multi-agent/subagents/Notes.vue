<script setup lang="ts">
import Callout from "@/components/harness/Callout.vue";
import Panel from "@/components/harness/Panel.vue";
import RouteHeader from "@/components/harness/RouteHeader.vue";
import SourceCode from "@/components/harness/SourceCode.vue";
</script>

<template>
  <RouteHeader path="/multi-agent/subagents" />
  <Callout tone="warn" title="Gap: tools with no supervisor, and no frontend (README §9.3)">
    <p>· <code>src/agent/tools.ts</code> (printed in two sections, joined with a labelled seam) defines the <code>research_agent</code> / <code>writing_agent</code> / <code>critique_agent</code> delegation tools and <code>runSubagent</code>, but imports nothing (<code>tool</code>, <code>z</code>, <code>OpenAI</code>, <code>SUBAGENT_FAILURE_MARKER</code>) and uses <code>AIMOCK_CONTEXT</code> and <code>forwardingFetch</code>, which no page defines.</p>
    <p>· <code>src/agent/state.ts</code> builds the <code>delegations</code> state from tool results, but nothing wires it to an agent.</p>
    <p>· No page builds the supervisor agent. Per your rules nothing was written in its place; neither file is served.</p>
    <p>· The “Rendering a live delegation log” section publishes no Vue code, so this route has no demo.</p>
  </Callout>
  <Panel title="Published backend, verbatim, not served">
    <div class="space-y-4">
      <SourceCode file="agent/src/agent/state.ts" />
      <SourceCode file="agent/src/agent/tools.ts" />
    </div>
  </Panel>
</template>
