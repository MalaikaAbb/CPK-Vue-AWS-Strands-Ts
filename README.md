# CopilotKit Vue + AWS Strands (TypeScript) Test Suite

A navigable, working test harness for CopilotKit's **Vue** frontend against an **AWS Strands (TypeScript)** agent. Each Vue doc page is a route that runs that page's own code.

| | |
|---|---|
| **Doc sync date** | Machine-maintained: `doc-snapshot/manifest.json` → `syncedAt` (baseline taken 2026-11-13, 22 pages; the nine Generative UI › Components pages added 2026-11-17, 31 in all). |
| **CopilotKit packages** | `@copilotkit/vue` 1.87.0 · `@copilotkit/core` 1.87.0 · `@copilotkit/runtime` 1.87.0 · `@ag-ui/client` 1.0.2 (`HttpAgent`, the same copy the runtime uses) |
| **Strands** | `@strands-agents/sdk` 1.24.0 · `@ag-ui/aws-strands` 1.0.2 · `express` 5.3.0 · `@modelcontextprotocol/sdk` 1.32.2 · `openai` 6.49.0 (harness-added, §9.2) · `tsx` 4.23.15 · TypeScript 7.0 (the Quickstart pins none) |
| **Frontend** | Vite 8.3 · Vue 3.5 · vue-router 5.5 · TypeScript 6.0 · Tailwind 4.3 (harness chrome only) · zod 3.25.76 · chart.js 4.6.1 · maplibre-gl 5.24.1 (Components pages) |
| **Build status** | No CI. `vite build` ✅. `vue-tsc` reports 9 errors, all in published doc code (§9.10). All 86 URLs (every route and every demo sample, Components pages included) mounted in headless Chrome with **zero console or page errors** (2026-11-17). The chain (runtime → `HttpAgent` → Strands agent → OpenAI) was driven with a **fake** key for `default`, `gen-ui-interrupt` and `interrupt-headless`: every run reached OpenAI and failed only with `401 Incorrect API key`. A captured model request showed a run's frontend tool and its context reaching the model. **No route has been driven against a live model yet.** |

---

## 2. Overview

Strands is AWS's agent SDK; this repo uses its TypeScript edition. CopilotKit reaches a Strands agent over AG-UI: the `@ag-ui/aws-strands` adapter (`StrandsAgent` + `createStrandsApp`) serves the agent as an Express endpoint, the Copilot Runtime registers an AG-UI `HttpAgent` pointed at it, and `@copilotkit/vue` renders the conversation, tools, state and interrupts.

This repo turns the Quickstart and the Basics, Generative UI, Interactivity and Agent capabilities sections of the Vue Strands (TypeScript) sidebar (22 pages) into one navigable Vite app. It adds the nine **Generative UI › Components** pages, which aren't under `/vue` and print each sample for React, Angular, React Native and Vue; only their Vue tab is used. Every route mounts the page's code verbatim, bugs included, and shows the exact files that run. Anything the harness added is marked **[harness]** in the file, in a pink **Harness** callout on the notes page, and, for stand-in components, with a **HARNESS STAND-IN** badge on screen.

Tracks: **<https://docs.copilotkit.ai/vue/strands-typescript>** and **<https://docs.copilotkit.ai/strands-typescript/generative-ui/components>**

---

## 3. Architecture

```
Browser — Vite dev server · localhost:5173
  │  @copilotkit/vue/v2; each /<route>/demo-chat mounts that page's own App.vue
  │  runtime-url="/api/copilotkit…" ──► Vite proxy /api → :8200
  ▼
Node · backend/server.ts · localhost:8200
  │  Vue Quickstart's host: createServer + createCopilotNodeListener({ cors: true })
  │  Strands landing page's runtime: my_agent = new HttpAgent({ url: AGENT_URL })
  │  /api/copilotkit           doc agent ids → my_agent; gen-ui-interrupt, interrupt-headless → INTERRUPT_AGENT_URL
  │  /api/copilotkit-threads   Intelligence quickstart's runtime (if key set)  [harness: own path]
  │  /api/copilotkit-mcp-apps  MCP Apps' runtime (mcpApps.servers)            [harness: own path]
  │  /api/copilotkit-tool-rendering  Tool Rendering's runtime: default → INTERRUPT_AGENT_URL/tool-rendering  [harness: own path]
  ▼  AG-UI over HTTP
Node · agent/ (npx tsx)
  │  main.ts · :8000                Strands TypeScript Quickstart: Agent(OpenAIModel("gpt-6-luna")) → StrandsAgent → createStrandsApp(…, { path: "/" })
  │  harness-interrupt.ts · :8010   [harness, flagged] same model + prompt, tools: [scheduleMeeting] from src/agent/interrupt-agent.ts
  │    /tool-rendering              [harness, flagged] same model + prompt, tools: [getWeather] from tool-rendering/src/agent/tools.ts (+ getWeatherImpl stand-in)
  ▼
OpenAI                                    MCP Apps example server on :3101 (MCP Apps route only)
```

**Four processes** (three without the interrupt and Tool Rendering routes). The agents and the Copilot Runtime are **TypeScript on Node** (`tsx`). The frontend is Vite.

**Where each piece comes from.**
- **The Vue Strands (TypeScript) Quickstart redirects to a landing page.** Its `.md` is the Vue (built-in agent) Quickstart, which says to keep its Vue frontend steps and take "the runtime wiring" from your framework's quickstart. So `App.vue`, `main.ts` and the Node host come from the Vue Quickstart.
- **The landing page's only code block is the runtime**, published as a Next.js route: `agents: { my_agent: new HttpAgent({ url: process.env.AGENT_URL! }) }`. It's used verbatim, hosted in the Vue Quickstart's Node listener.
- **The agent** is the Strands TypeScript Quickstart's (`/strands-typescript/quickstart`, linked as the landing page's guide): "Use an existing agent", TypeScript tab, OpenAI variant. That's `agent/main.ts` verbatim, in a project created with the Quickstart's own commands (`npm init -y`, `npm install -D typescript @types/node tsx`, `npx tsc --init`, then its `npm install` lines), plus two flagged fixes it needs to start (§9.2).

### Agent ids

The landing page registers only `my_agent`. The Vue samples use `default` (no agent-id), `my-agent`, `sales`, `support`, `gen-ui-interrupt`, `interrupt-headless`, `researcher`, `workspace` and `writer`. Every id is `my_agent` (`backend/agents.ts`), except the two interrupt ids. HITL Overview and useInterrupt publish `src/agent/interrupt-agent.ts` (a pausing `schedule_meeting` tool, no imports, no agent) and say the showcase "mounts a dedicated interrupt agent and points the interrupt demos' agent names at it". At your request ("Imports + agent, readResume undefined"), `agent/harness-interrupt.ts` (flagged) supplies the tool's two missing imports, builds the agent and serves it on :8010; `gen-ui-interrupt` and `interrupt-headless` point there (§9.5). The other page backends are fragments with no agent (§9.3).

### What the adapter does for you (verified by capturing the model request)

- **Frontend tools:** `@ag-ui/aws-strands` proxies every tool in the run's `tools` into the agent, so the Quickstart agent can call `useFrontendTool`, `useComponent` and `useHumanInTheLoop` tools with no change to `main.ts`. A run with one frontend tool sent it to OpenAI in the request's `tools`.
- **Context:** it prepends the run's `context` to the user message ("Context provided by the application: - workspace: northstar"), so `useAgentContext` values reach the model.
- **Generative UI › Components:** the runtime adds `render_ui` to the run's tools and its guide to the run's context, so both reach the model by the two paths above. The Quickstart's `OpenAIModel` calls the Responses API (`/v1/responses`). Checked by capturing the model request with a fake key (§9.14).
- **Interrupts:** only on the interrupt agent (:8010), through `schedule_meeting`'s `context.interrupt(...)`. Resuming fails (§9.5).
- **Not provided:** other backend tools and writes to shared state. The Quickstart agent has none, and no page publishes a usable one.

---

## 4. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | **24.12+** (or 22.18+) | `create-vue`'s scaffold requires it; `--env-file` needs 20.6+. Developed on 24.16. |
| npm | 10+ | Developed on npm 12. |
| OpenAI API key | — | Required, in `agent/.env`. The agent uses `gpt-6-luna` as published. |
| CopilotKit Intelligence key | — | Optional, only for the two Threads routes. |

No Python is needed.

---

## 5. Setup

```bash
git clone <this-repo> aws-strands-ts && cd aws-strands-ts
cd agent && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cp .env.example agent/.env              # set OPENAI_API_KEY
cp .env.example backend/.env            # AGENT_URL is pre-filled
```

| File | Variable | What it does |
|---|---|---|
| `agent/.env` | `OPENAI_API_KEY` | **Required.** Read by `main.ts` and `harness-interrupt.ts` (`process.env`). |
| `agent/.env` | `INTERRUPT_AGENT_PORT` | Optional. Port of the flagged interrupt agent (default 8010). |
| `backend/.env` | `AGENT_URL` | **Required.** The landing page's `HttpAgent` URL: `http://localhost:8000/`. |
| `backend/.env` | `INTERRUPT_AGENT_URL` | Optional. Where the interrupt ids go (default `http://localhost:8010/`). |
| `backend/.env` | `CPK_INTELLIGENCE_API_KEY` | Optional. Intelligence for the Threads runtime: `cd backend && npx copilotkit@latest login && npx copilotkit@latest project select`. |
| `backend/.env` | `APP_USER_ID` · `MCP_APPS_URL` · `PORT` · `COPILOTKIT_TELEMETRY_DISABLED` | Optional: fixed local Threads identity (default `local-user`), MCP server URL (default `http://localhost:3101/mcp`), runtime port (default 8200), telemetry opt-out. |

**Ports:** agent **8000** (hard-coded in the Quickstart's `main.ts`), interrupt agent **8010**, runtime **8200**, frontend **5173** (`strictPort`), MCP Apps example **3101**.

---

## 6. Running the project

```bash
# 1 — Strands agent (the Quickstart's command; --env-file supplies OPENAI_API_KEY)
cd agent && npx tsx --env-file=.env main.ts
```
Success: `Agent listening on http://localhost:8000`. **If port 8000 is taken:** `main.ts` hard-codes it, so stop the other server (or run a local copy with another port and set `AGENT_URL`; don't edit `main.ts`).

```bash
# 1b — [harness] interrupt agent + Tool Rendering's getWeather (only for the two interrupt routes and Tool Rendering)
cd agent && npx tsx --env-file=.env harness-interrupt.ts
```
Success:
```
[harness] Interrupt agent listening on http://localhost:8010
  + /tool-rendering  (Tool Rendering's getWeather)
```

```bash
# 2 — Copilot Runtime
cd backend && npm run dev
```
Success:
```
Copilot Runtime listening at http://localhost:8200/api/copilotkit
  Agent: http://localhost:8000/
  + /api/copilotkit-threads  (sse)
  + /api/copilotkit-mcp-apps
  + /api/copilotkit-tool-rendering
```
If it prints `.env not found` and `Agent: (AGENT_URL not set)`, `backend/.env` is missing: `cp .env.example backend/.env` and restart. (`agent/.env` is a separate file; the backend doesn't read it.)

```bash
# 3 — Vue app
cd frontend && npm run dev               # → http://localhost:5173/
```

Open **<http://localhost:5173>**. The landing page's **Connection** panel probes the runtime paths. **MCP Apps route only:** `cd backend && npm run mcp:apps`.

---

## 7. What to expect: walkthrough per section

Each route has a notes page (`/<route>`: notes, Try-it prompts with pass/fail, the exact source, unmounted samples as published, Harness and gap callouts) and a demo (`/<route>/demo-chat`; a **Sample** picker where a page has several samples).

### Getting Started
**`/quickstart`**: **Try:** `Hello! What can you do?` **Pass:** a streamed reply. **Fail:** connection refused or `RUN_ERROR` means the agent isn't running or `AGENT_URL` is wrong (an HTTP 404 means another server is on that port). A 401 means `OPENAI_API_KEY` is missing from `agent/.env`.

### Basics
**`/prebuilt-components`**, **`/custom-look-and-feel/headless-ui`**, **`/programmatic-control`**: chat against `my_agent`: a streamed reply. Headless UI streams into bare rows. Programmatic Control's default sample adds a chat (harness, on request). **`/custom-look-and-feel/slots`**: nine samples; the **Disclaimer** sample shows no disclaimer (doc bug, §9.11).
**`/prebuilt-components/copilot-threads-drawer`**, **`/headless-threads`**: need `CPK_INTELLIGENCE_API_KEY`. `/api/copilotkit-threads/info` should report `mode: "intelligence"`.
**`/frontend-tools`**: **Try:** `Only show sev1 incidents`. **Pass:** "Current filter" changes to `sev1` and the agent confirms.

### Generative UI
**`/generative-ui/tool-based`**: **Try:** `Show me the weather in Paris`. **Pass:** an inline WeatherCard.
**`/generative-ui/tool-rendering`**: runs on its own runtime path, whose `default` is the page's `getWeather` with a stand-in `getWeatherImpl`, served by terminal 1b (§9.3). **Try:** `What's the weather in Paris?` **Pass:** zero-config shows a `get_weather` card ending "Done"; per-tool shows the JSON result (its heading stays empty: the card reads `parameters.city`, but the tool's argument is `location`, a doc bug); catch-all shows the BrandedToolCard stand-in with the result. **Fail:** connection refused / `RUN_ERROR` naming `:8010/tool-rendering` means terminal 1b isn't running.
**`/generative-ui/state-rendering`**: **Expected now:** "Idle" (no backend published, §9.4).
**`/generative-ui/mcp-apps`**: needs `npm run mcp:apps`. **Try:** `What time is it on the server?` **Pass:** a tool call, then an inline iframe app.

### Generative UI › Components (Vue tab of the `/strands-typescript/generative-ui/components` pages)
All run on `default`, the Quickstart agent, which receives both the `render_ui` tool and its guide (§9.14). Whether the model renders well is not yet checked against a live model.
**`/generative-ui/components`**: the overview's `App.vue` with the standard catalog. It calls `:8200` directly, as published. **Try:** `Compare the Starter, Team, and Enterprise plans in a table`. **Pass:** a table component in the chat.
**`/generative-ui/components/catalogs`**: your own catalog (`ProductGrid`, `ProductCard`). **Try:** `Show me two products`. **Pass:** a grid of product cards.
**`/generative-ui/components/surfaces`**: a page target (`featured`) above the chat; its default content is a **stand-in** `ProductRow`. **Pass:** the agent replaces it with a ProductGrid.
**`/generative-ui/components/standard-catalog`**: the standard catalog, and a sample that replaces `Card` with `MyCard`.
**`/generative-ui/components/state-and-actions`**: `ProductCard` with "Add to cart" (an `onAddToCart` event bound to an `addToCart` function). The handler sample needs `./cart-store`, which isn't published, so clicking takes the card's error path.
**`/generative-ui/components/theming`**: standard components in the amber accent and 10px radius.
**`/generative-ui/components/transports`**: tool, markdown and `agentIds: ['shop']` samples.
**`/generative-ui/components/markdown-mode`**: the guide travels in context, which the adapter puts in the prompt, so the agent can answer with `a2ui` blocks. The `sendContext: false` sample puts the guide only in forwarded props, which no published Strands code reads; the captured request carried no guide.
**`/generative-ui/components/from-a2ui`**: the "After" provider; `Airport` and `Arrow` are **stand-ins**.

### Interactivity
**`/shared-state`**: **Try:** **Prefer concise answers**. **Pass:** `preferences.tone` appears in the agent state (Inspector › State). The notes list stays empty (§9.4).
**`/shared-state/rendering-in-app`**: the Canvas shows "Project launch", but the agent can't edit it (§9.4).
**`/shared-state/streaming`**: **Expected now:** "Waiting for a draft…" throughout (§9.4).
**`/shared-state/agent-readonly`**: **Try:** `Which workspace am I in?` **Pass:** "northstar".
**`/human-in-the-loop`**: **Try:** `Schedule a meeting about Q3 planning with Dana`. **Pass:** a time-picker card (flagged stand-in); picking a slot resumes the run.
**`/human-in-the-loop/governed-actions`**: **Try:** `Refund $40 to customer 1182. Call approve_governed_action first with id a-1, tool send_refund, reference POL-7, verdict require_approval.` **Pass:** an approval card.
**`/human-in-the-loop/useInterrupt`**: needs terminal 1b. **Try:** `Schedule a meeting about Q3 planning`. **Expected now:** "Pick a time for …" with Tomorrow at 09:00 / Cancel. Picking either resumes the run, which then ends in `RUN_ERROR`: the tool calls `readResume`, which no page defines (§9.5). **Fail:** a prose reply and no picker means the interrupt agent isn't running on :8010, or the model didn't call the tool.
**`/human-in-the-loop/headless`**: **Expected now:** no interrupt. Start asks for a governed action, and the interrupt agent's only pausing tool is `schedule_meeting` (§9.5).
**`/webmcp`**: stand-in sample only (your choice). In Chrome 149+ with WebMCP, **Run tool** `searchOrders` `{"status":"open"}` returns ORD-1001 and ORD-1004.

### Agent capabilities
**`/multi-agent/subagents`**: notes only (§9.3).

---

## 8. Testing checklist / current status

| Doc page | Route | Status | Notes |
|---|---|---|---|
| `/vue/strands-typescript` | `/` | 📖 Reference | Landing page. |
| `/vue/strands-typescript` (Quickstart) | `/quickstart` | ✅ Working | Chain verified with a fake key (OpenAI 401). Needs the two flagged `package.json` fixes (§9.2). |
| `prebuilt-components` | same | ✅ Working | Only `CopilotChat` has code. |
| `custom-look-and-feel/slots` | same | ⚠️ Partial | Imports added to fragments; 2 stand-ins; `labels` type error; disclaimer never renders (§9.10, §9.11). |
| `custom-look-and-feel/headless-ui` | same | ✅ Working | |
| `programmatic-control` | same | ✅ Working | Default sample adds a harness chat (on request). |
| `prebuilt-components/copilot-threads-drawer` | same | ⚠️ Partial | Intelligence quickstart runtime, fixed local identity; needs a key (§9.7). |
| `headless-threads` | same | ⚠️ Partial | Same runtime (§9.7). |
| `frontend-tools` | same | ✅ Working | Adapter proxies the tool (captured). Not yet run against a live model. |
| `generative-ui/tool-based` | same | ✅ Working | Same. |
| `generative-ui/tool-rendering` | same | ⚠️ Partial | Published `getWeather` + flagged `getWeatherImpl` stand-in on `harness-interrupt.ts`'s `/tool-rendering`, own runtime path; stand-in-model run completed the tool loop; per-tool card reads `city` (doc bug); not driven live (§9.3). |
| `generative-ui/state-rendering` | same | ❌ Broken | No backend published (§9.4). |
| `generative-ui/mcp-apps` | same | ⚠️ Partial | Needs `npm run mcp:apps`; placeholder URL replaced (§9.8). |
| `/strands-typescript/generative-ui/components` | same | ⚠️ Partial | `App.vue` verbatim + chart/map plugins; tool + guide reach the model (captured at the agent); not driven live (§9.14). |
| `…/components/surfaces` | same | ⚠️ Partial | `ProductRow` stand-in; not driven live. |
| `…/components/catalogs` | same | ⚠️ Partial | Provider line wrapped with a chat; `render_ui` + guide reach the model (captured at the agent, §9.14); not driven live. |
| `…/components/standard-catalog` | same | ⚠️ Partial | Not driven live. |
| `…/components/state-and-actions` | same | ⚠️ Partial | `./cart-store` never published; not driven live. |
| `…/components/theming` | same | ⚠️ Partial | Not driven live. |
| `…/components/transports` | same | ⚠️ Partial | Tool and markdown: tool/guide reach the model; not driven live. |
| `…/components/markdown-mode` | same | ⚠️ Partial | Guide reaches the model via context; the `sendContext: false` sample sends none (§9.14). |
| `…/components/from-a2ui` | same | ⚠️ Partial | `Airport`/`Arrow` stand-ins; not driven live. |
| `shared-state` | same | ⚠️ Partial | Read + tone write-back; nothing writes `notes` (§9.4). |
| `shared-state/rendering-in-app` | same | ⚠️ Partial | Canvas renders; agent can't write (§9.4). |
| `shared-state/streaming` | same | ❌ Broken | No backend published (§9.4). |
| `shared-state/agent-readonly` | same | ✅ Working | Adapter puts context into the prompt (captured). |
| `human-in-the-loop` | same | ⚠️ Partial | Proxied tool; `TimePickerCard` stand-in. |
| `human-in-the-loop/useInterrupt` | same | ⚠️ Partial | Page's `interrupt-agent.ts` in a flagged harness agent (:8010); pauses, but resuming throws (`readResume` undefined, §9.5). |
| `human-in-the-loop/headless` | same | ❌ Broken | Runs the interrupt agent, but Start's prompt doesn't fit its only pausing tool (§9.5). |
| `human-in-the-loop/governed-actions` | same | ⚠️ Partial | Tool half proxied; interrupt half §9.5; `executeSideEffect` undefined. |
| `webmcp` | same | ⚠️ Partial | Stand-in sample only; as published every call errors (§9.6). |
| `multi-agent/subagents` | same | ❌ Broken | Tools and state are fragments, no supervisor; no Vue code (§9.3). |

**Legend:** ✅ Working · ⚠️ Partial · 📖 Reference · 🚧 Not started · ❌ Broken. "Working" means wired and verified from code, mounts, and the fake-key run; **not yet driven against a live model.**

---

## 9. Known issues / doc-vs-implementation discrepancies

All against `@copilotkit/vue` / `@copilotkit/runtime` 1.87.0, `@ag-ui/aws-strands` 1.0.2, `@strands-agents/sdk` 1.24.0, and the docs as of the 2026-11-13 baseline.

**1. The Quickstart is split across three pages.** `/vue/strands-typescript/quickstart` redirects (307) to the landing page. The root `.md` is the built-in Vue Quickstart (`BuiltInAgent`), rendered on `/vue`. The landing page renders a single code block, the runtime route, which appears in no `.md`. The agent is on the non-Vue `/strands-typescript/quickstart` "Use an existing agent" tab, which renders client-side (verified through `data-raw-code`). That page carries both the Python and TypeScript paths, each with OpenAI and Anthropic variants; this repo uses the TypeScript OpenAI `main.ts`. Apart from the slug, 18 of the 22 Vue pages are identical to the Python Strands pages; only HITL Overview, useInterrupt, Tool Rendering and Sub-agents differ, in their backend code.

**2. The TypeScript Quickstart's agent doesn't start as published (two harness fixes, your choice).** (a) Its setup runs `npm init -y`, which writes `"type": "commonjs"`, and `main.ts` uses top-level `await`, so `npx tsx main.ts` fails: `Top-level await is currently not supported with the "cjs" output format`. (b) Its install line (`npm install @ag-ui/aws-strands @strands-agents/sdk express`, plus `@modelcontextprotocol/sdk`) never installs `openai`, which `@strands-agents/sdk/models/openai` imports: `ERR_MODULE_NOT_FOUND: Cannot find package 'openai'`. (The Python line gets it through `strands-agents[OpenAI]`.) At your request ("Flagged minimal fix"), `agent/package.json` has `"type": "module"` and an `openai` dependency; `main.ts` is unchanged. With both, a fake-key run reaches OpenAI.

**3. The TypeScript page backends are fragments.** [Tool Rendering](https://docs.copilotkit.ai/vue/strands-typescript/generative-ui/tool-rendering) prints `src/agent/tools.ts` as one tool, `getWeather`, with no imports and no agent; its callback returns `getWeatherImpl(location)`, which no page defines. [Sub-agents](https://docs.copilotkit.ai/vue/strands-typescript/multi-agent/subagents) prints a different `src/agent/tools.ts` (two sections: `runSubagent` and the three delegation tools) and `src/agent/state.ts` (the `delegations` state builder). They import nothing (`tool`, `z`, `OpenAI`, `SUBAGENT_FAILURE_MARKER`), use `AIMOCK_CONTEXT` and `forwardingFetch`, which no page defines, and no page builds the supervisor. By your rules these are gaps: Sub-agents' files are kept verbatim in `agent/src/agent/` (joined with a labelled seam) and not served. Sub-agents' "Rendering a live delegation log" publishes no Vue code.

**Tool Rendering's `getWeather` is served (2026-11-17, at your request, matching the aws-strands-py harness).** Its file is written verbatim to `agent/tool-rendering/src/agent/tools.ts` (it can't share `src/agent/tools.ts` with Sub-agents). `harness-interrupt.ts` loads it unchanged, as it loads `interrupt-agent.ts`, with the three names it uses set as globals: `tool`, `z`, and `getWeatherImpl`. `getWeatherImpl` is defined by no page, so it is a flagged **stand-in** returning fixed sample weather. The tool agent (Quickstart model and prompt + `tools: [getWeather]`) is mounted at `/tool-rendering` on that same server with `addStrandsExpressEndpoint`: a route, not another process. The Tool Rendering samples use `default`, which every route shares, so they get their own runtime path on the same Node server, `/api/copilotkit-tool-rendering` (`backend/runtimes/tool-rendering.ts`). Their three `App.vue` `runtime-url`s are changed and labelled, as for MCP Apps. Verified with a fake key and a local stand-in Responses-API model: the model was offered `get_weather` with the published schema, the tool ran, its result went back to the model, and the run streamed `TOOL_CALL_START/ARGS/END/RESULT`. Per-tool's `WeatherToolCard.vue` reads `parameters.city`, but the tool's argument is `location`, so its heading stays empty (doc bug, left as published). Unlike the Python harness, no `reasoning_effort` fix was needed for the stand-in run: the TypeScript `OpenAIModel` defaults to the Responses API, not Chat Completions. Not yet driven against live `gpt-6-luna`.

**4. No backend for shared state.** State Rendering, Shared State and State Streaming publish no Strands backend. Their agent ids are `my_agent`, which writes no state, so `ResearchProgress` stays "Idle", the notes list stays empty, `StreamingDocument` never fills, and the Canvas can't be edited by the agent. UI-side state (seeding, the tone write-back) still works.

**5. Interrupts: a tool, no agent, and an undefined helper.** [HITL Overview](https://docs.copilotkit.ai/vue/strands-typescript/human-in-the-loop) and [Pausing the Agent for Input](https://docs.copilotkit.ai/vue/strands-typescript/human-in-the-loop/useInterrupt) print the same `src/agent/interrupt-agent.ts`: a `schedule_meeting` tool whose callback calls `context.interrupt({ name, reason })`. It has no imports (`tool`, `z`) and no `Agent`. It also calls `readResume(answer)` and names a `ResumeEnvelope` type; no page defines either. Both pages say the showcase mounts a dedicated interrupt agent for the interrupt demos' agent names, leaving `schedule_meeting` on the shared agent for the frontend-tool flow. At your request ("Imports + agent, readResume undefined"), `agent/harness-interrupt.ts` (flagged) sets `tool` and `z` as globals, loads the file unchanged, builds an `Agent` from the Quickstart's model and prompt plus `tools: [scheduleMeeting]`, and serves it on :8010. It's a second process because `main.ts` builds and starts its own app and exports nothing. `zod` comes from `@strands-agents/sdk`'s own dependencies. `gen-ui-interrupt` and `interrupt-headless` point there; HITL Overview's `default` stays on the Quickstart agent. Verified with a fake key: the tool is declared to the model with the published schema, and both ids reach OpenAI (401). The type is erased at run time, but **`readResume` throws `ReferenceError` when a paused run resumes**, so the picker appears and the answer never completes the tool. [Headless Interrupts](https://docs.copilotkit.ai/vue/strands-typescript/human-in-the-loop/headless) publishes no backend; its Start button sends "Prepare the governed action.", which the meeting tool doesn't fit. `lookupUserDepartment` in the `handler` sample is undefined.

**6. Undefined functions left undefined.** `searchOrders` (WebMCP: as published every call throws; the demo shows only a flagged stand-in sample, your choice), `executeSideEffect` (Governed Actions), `lookupUserDepartment` (useInterrupt), `readResume` (interrupt agent), `getWeatherImpl` (Tool Rendering: a flagged stand-in at your request, §9.3), `forwardingFetch` / `AIMOCK_CONTEXT` (Sub-agents).

**7. Threads: Intelligence quickstart runtime.** Wired per the [Vue Strands (TypeScript) Intelligence quickstart](https://docs.copilotkit.ai/vue/strands-typescript/intelligence/quickstart) (identical to the Python one apart from the slug). Its `authenticateApplicationUser` is never defined; per that page's "a fixed identity is suitable only for a local, single-user demo", it returns `local-user` / "Local user" (flagged, **not authentication**). Without `CPK_INTELLIGENCE_API_KEY` the path is plain SSE, and the runtime logs that `GET /threads` returns 403. Restart the backend after `project select`. The Threads `App.vue` files use `/api/copilotkit-threads` (published value kept as a comment).

**8. MCP Apps.** The published server URL is a placeholder, replaced by the page's own `http://localhost:3101/mcp` example served by `npm run mcp:apps`. It runs on its own runtime path because `mcpApps` applies to every agent on a runtime; both `App.vue` `runtime-url`s are changed (labelled).

**9. Port 8000.** The Quickstart's `main.ts` hard-codes `app.listen(8000)`. If something else already listens there, `main.ts` fails to start (`EADDRINUSE`), or the runtime reaches that other server and runs fail with `HTTP 404`.

**10. Type errors in published doc code** (`npm run type-check`, 9 errors): the `labels` prop is typed as literal default strings; `useRenderTool`, `useDefaultRenderTool` and `useHumanInTheLoop` reject render components that declare only the props they use; `searchOrders` ×2; Surfaces' `FeaturedProducts.vue` imports `../product`, a type module no page publishes. `npm run build` is `vite build`.

**11. Slots › Disclaimer never renders.** `CopilotChat`'s `#input` slot props don't include `showDisclaimer`, so the sample's `CopilotChatInput` never shows its `#disclaimer` slot. Left as published.

**12. Fragments, stand-ins and wrappers.** Slots' fragments get imports only, and "Three levels" is nested in "Two levels". Headless UI's `RenderedMessages.vue` is mounted with the minimal `HeadlessChat.vue` as its composer. Shared State's two `SharedWorkspace.vue` fragments are merged. Stand-ins: `TimePickerCard.vue`, `CustomMessageView`, `CustomToolbarAction`, `BrandedToolCard`, `searchOrders` (on request). `HarnessApp.vue` mounts HITL's `MeetingApproval` beside a chat. **Shown only:** `agent.subscribe`, Programmatic Control's resume fragment, the watch-sources line, Headless Threads' pagination, `toggleItem`, useInterrupt's `enabled`/`handler`/multi-interrupt samples, and Governed Actions' type and `handleApproval`.

**13. The harness itself.** There's no root `CopilotKitProvider`: each demo mounts its page's own `App.vue`. Doc sync runs as Vite dev-server middleware and diffs the `.md` of all 31 tracked pages (the 22 Vue pages and the nine Components pages), so changes to the landing runtime block or the Strands Quickstart are invisible to it. `npm run doc-files` re-reads both live. The block-catalog builder reads both backtick and tilde fences (the interrupt and sub-agent backends are tilde-fenced) and code the rendered page carries in RSC text chunks.

**14. Generative UI › Components (added 2026-11-17).**
- **The pages.** The nine pages live under `/strands-typescript/generative-ui/components`, not `/vue`, and print each sample in React, Angular, React Native and Vue tabs. Only the Vue tab and untabbed code are used; tab membership is read from the snapshot's `<Tab value="Vue">` markup.
- **The agent.** The overview's Vue setup includes its own runtime: a TanStack `BuiltInAgent` (`@tanstack/ai`, `openaiText("gpt-6-luna")`, `convertInputToTanStackAI`). It's shown on the route and not served. The samples keep `runtime-url="/api/copilotkit"`, so they run on the Strands TypeScript Quickstart agent (`main.ts`, unchanged).
- **The guide reaches the model.** For a run that carries a catalog, the Copilot Runtime's generative-UI middleware adds `render_ui` to the run's tools and its guide (components, props, how to call the tool) to the run's context (`@copilotkit/runtime` 1.87.0, `generative-ui-middleware`). `@ag-ui/aws-strands` 1.0.2 proxies `render_ui` into the agent and puts the context at the top of the user message ("Context provided by the application:"). **Captured 2026-11-17** by running a copy of `main.ts` on a spare port against a local stand-in for OpenAI and posting a run with `render_ui` and a guide: the request went to `POST /v1/responses` with `tools: [render_ui]`, the guide in the first user input, and no `reasoning` field. Not yet checked against a live model.
- **No `reasoning_effort` error here.** The Python harness hit `400 … Function tools with reasoning_effort are not supported for gpt-6-luna in /v1/chat/completions` on these routes. Strands TypeScript's `OpenAIModel` defaults to the Responses API (Chat Completions only with `api: 'chat'`), so the Quickstart's model needs no change.
- **Same content as the Python pages.** The nine `/strands-typescript/...` pages were byte-identical to the `/strands/...` ones on 2026-11-17, apart from the slug; Markdown mode's backend fragment is Python even here.
- **What the harness wrote, all flagged:**
  - Five pages print only an opening `<CopilotKitProvider …>` line (Catalogs, Transports ×3, Markdown mode's `sendContext: false`, Adopt from A2UI's "After"). The harness adds the imports, a `<CopilotChat />` and the closing tag.
  - Three pages print a provider component with a `<slot />` (Standard catalog, Theming, Markdown mode's `App.vue`). The harness puts a `<CopilotChat />` in the slot.
  - Surfaces, Standard catalog's override and State and actions get small harness pages that put the published pieces together.
  - Two modules printed without imports (State and actions' `shop-ui.ts`, Adopt from A2UI's `app-ui.ts`) get only their import lines.
  - Surfaces' `FeaturedProducts.vue` imports `../shop-ui`, which that page never prints. The Catalogs page's `shop-ui.ts` (same `acme/shop@1`) and its two components are copied there, labelled.
  - The overview's plugin entry (`GenerativeUIChart`, `GenerativeUIMap`) is applied in the harness's `src/main.ts`, and `chart.js` and `maplibre-gl` are installed as the page says.
- **Stand-ins (flagged):** `ProductRow` (Surfaces), `Airport` and `Arrow` (Adopt from A2UI).
- **Shown only:**
  - Catalogs' type-error demo and its `exportA2UICatalog` script;
  - Surfaces' recommendations sample (`Product` type never published);
  - State and actions' cart samples (`./cart-store` never published);
  - Theming's `index.html` dark-mode script, since it would affect every route;
  - Markdown mode's backend fragment (`MY_PROMPT` undefined);
  - Adopt from A2UI's "Before" (`vueBasicCatalog` undefined).

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Top-level await is currently not supported with the "cjs" output format` | `agent/package.json` lost `"type": "module"` (e.g. re-created with `npm init -y`) | Restore it (§9.2). |
| `Cannot find package 'openai'` | `openai` not installed in `agent/` | `cd agent && npm install` (it's in `package.json`, §9.2). |
| Backend logs `.env not found` and `Agent: (AGENT_URL not set)`; on the first message, `Agent execution failed: TypeError: Failed to parse URL from undefined` | `backend/.env` missing, so `HttpAgent` gets `url: undefined` | `cp .env.example backend/.env` (`AGENT_URL` is pre-filled); restart the backend. |
| Connection refused, or `RUN_ERROR` naming the agent URL | Agent not running, or `AGENT_URL` wrong | Start terminal 1; check `AGENT_URL` in `backend/.env`; restart the backend. |
| `RUN_ERROR "HTTP 404"` or `EADDRINUSE :8000` | Another server holds port 8000 | §9.9: free the port. |
| `RUN_ERROR "401 Incorrect API key"` | `OPENAI_API_KEY` missing or wrong in **`agent/.env`** | Fix it and restart the agent with `--env-file=.env`. |
| useInterrupt: no picker, connection refused | Interrupt agent not running | Start terminal 1b. |
| useInterrupt: `RUN_ERROR … readResume is not defined` after a pick | Doc gap (§9.5) | Expected. |
| `Agent … not found` | Backend isn't this repo's `server.ts` | Run `backend/server.ts`. |
| Threads stay on "Loading threads…" | Runtime started before the key existed (SSE → 403) | Restart the backend; the startup line must say `(intelligence)`. |
| CORS error on `/quickstart` or `/generative-ui/components` | Those `App.vue` files call `:8200` directly | Keep `cors: true`. |
| `Port 5173 is in use` | Another harness's Vite | Stop it (one harness at a time on 5173/8200). |

---

## Doc drift detection

`/doc-sync` fetches the `.md` behind all 31 tracked pages, diffs each against `doc-snapshot/pages/`, replaces the snapshot, and ranks changes High/Medium/Low. Commit `pages/`, `manifest.json` and `CHANGELOG.md`; `reports/` is gitignored. **Regenerating the doc files:** `cd frontend && npm run doc-files` rebuilds the block catalog (snapshot pages, plus the Strands Quickstart fetched live, every block checked against the rendered page). It then rewrites the verbatim doc files, `src/lib/published.json`, `agent/main.ts`, `agent/src/agent/interrupt-agent.ts`, `agent/src/agent/state.ts` and `agent/src/agent/tools.ts`.

---

## 11. Project structure

```
aws-strands-ts/
├── CLAUDE.md · PR_GUIDELINES.md · README.md · .env.example
├── doc-snapshot/                    # pages/*.md + manifest.json — doc-sync baseline
├── agent/                           # Strands (TypeScript, npx tsx)
│   ├── main.ts                      # ★ Strands TypeScript Quickstart agent, verbatim — Express :8000
│   ├── package.json                 # Quickstart's npm init + installs; [harness] "type": "module", openai (§9.2)
│   ├── harness-interrupt.ts         # [harness, flagged] interrupt agent — Express :8010 (§9.5) + /tool-rendering (§9.3)
│   ├── tool-rendering/src/agent/tools.ts  # Tool Rendering's getWeather, verbatim — served via harness-interrupt.ts
│   └── src/agent/
│       ├── interrupt-agent.ts       # HITL / useInterrupt tool, verbatim — served via harness-interrupt.ts
│       └── state.ts · tools.ts      # Sub-agents fragments, verbatim, NOT served (§9.3)
├── backend/                         # Copilot Runtime, Node :8200
│   ├── server.ts                    # ★ Vue Quickstart host + landing runtime
│   ├── agents.ts                    # HttpAgent per doc agent id
│   └── runtimes/ threads.ts · mcp-apps.ts · tool-rendering.ts
└── frontend/                        # Vite + Vue 3
    ├── scripts/ build-doc-catalog.py · write-doc-files.py · write-genui-files.py (Components) · write-demo-entries.py
    └── src/ lib/nav-config.ts (★ routes + statuses) · routes/<doc path>/{Notes.vue, demo-chat/} · …
```

---

## 12. References

**Getting Started**: [Quickstart (landing)](https://docs.copilotkit.ai/vue/strands-typescript) · [Vue Quickstart (frontend steps)](https://docs.copilotkit.ai/vue) · [Strands TypeScript Quickstart (agent)](https://docs.copilotkit.ai/strands-typescript/quickstart)

**Basics**: [Prebuilt Components](https://docs.copilotkit.ai/vue/strands-typescript/prebuilt-components) · [Slots](https://docs.copilotkit.ai/vue/strands-typescript/custom-look-and-feel/slots) · [Headless UI](https://docs.copilotkit.ai/vue/strands-typescript/custom-look-and-feel/headless-ui) · [Programmatic Control](https://docs.copilotkit.ai/vue/strands-typescript/programmatic-control) · [Threads Drawer](https://docs.copilotkit.ai/vue/strands-typescript/prebuilt-components/copilot-threads-drawer) · [Headless Threads](https://docs.copilotkit.ai/vue/strands-typescript/headless-threads) · [Frontend Tools](https://docs.copilotkit.ai/vue/strands-typescript/frontend-tools)

**Generative UI**: [Components as Tools](https://docs.copilotkit.ai/vue/strands-typescript/generative-ui/tool-based) · [Tool Call Rendering](https://docs.copilotkit.ai/vue/strands-typescript/generative-ui/tool-rendering) · [State Rendering](https://docs.copilotkit.ai/vue/strands-typescript/generative-ui/state-rendering) · [MCP Apps](https://docs.copilotkit.ai/vue/strands-typescript/generative-ui/mcp-apps)

**Generative UI › Components**: [Components and surfaces](https://docs.copilotkit.ai/strands-typescript/generative-ui/components) · [Surfaces](https://docs.copilotkit.ai/strands-typescript/generative-ui/components/surfaces) · [Catalogs](https://docs.copilotkit.ai/strands-typescript/generative-ui/components/catalogs) · [Standard catalog](https://docs.copilotkit.ai/strands-typescript/generative-ui/components/standard-catalog) · [State and actions](https://docs.copilotkit.ai/strands-typescript/generative-ui/components/state-and-actions) · [Theming](https://docs.copilotkit.ai/strands-typescript/generative-ui/components/theming) · [Transports](https://docs.copilotkit.ai/strands-typescript/generative-ui/components/transports) · [Markdown mode](https://docs.copilotkit.ai/strands-typescript/generative-ui/components/markdown-mode) · [Adopt from A2UI](https://docs.copilotkit.ai/strands-typescript/generative-ui/components/from-a2ui)

**Interactivity**: [Shared State](https://docs.copilotkit.ai/vue/strands-typescript/shared-state) · [Render agent state in your app](https://docs.copilotkit.ai/vue/strands-typescript/shared-state/rendering-in-app) · [State Streaming](https://docs.copilotkit.ai/vue/strands-typescript/shared-state/streaming) · [Agent Read-Only Context](https://docs.copilotkit.ai/vue/strands-typescript/shared-state/agent-readonly) · [HITL Overview](https://docs.copilotkit.ai/vue/strands-typescript/human-in-the-loop) · [Pausing the Agent for Input](https://docs.copilotkit.ai/vue/strands-typescript/human-in-the-loop/useInterrupt) · [Headless Interrupts](https://docs.copilotkit.ai/vue/strands-typescript/human-in-the-loop/headless) · [Governed Action Approval UI](https://docs.copilotkit.ai/vue/strands-typescript/human-in-the-loop/governed-actions) · [WebMCP](https://docs.copilotkit.ai/vue/strands-typescript/webmcp)

**Agent capabilities**: [Sub-agents](https://docs.copilotkit.ai/vue/strands-typescript/multi-agent/subagents)

**Intelligence (Threads routes)**: [Connect Intelligence in 5 minutes](https://docs.copilotkit.ai/vue/strands-typescript/intelligence/quickstart)
