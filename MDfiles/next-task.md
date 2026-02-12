# Plan: Gemini-Powered Chat Assistant for RCA Configuration Tool

## Context

The Salesforce RCA Configuration Tool currently requires users to manually navigate UI pages to define pipeline steps, enter data, and run deployments. This plan adds a **floating chat widget** powered by **Google Gemini** that lets users perform all these operations conversationally (e.g., "Add 3 products: Widget A, Widget B, Widget C"). Gemini acts as both the orchestrator (picks the right tool) and data generator (creates entries from natural language).

**Key architectural decisions:**
- Chat UI = floating widget (bottom-right, accessible from every dashboard page)
- All tool executions go through existing Next.js API routes (zero validation duplication)
- Tool definitions are config-driven (single config file — adding a new feature = adding a config entry)
- Data entry mutations return as `clientActions` that the frontend dispatches to `ConfigDataContext`
- Deployment/rollback are NOT executed from the chat route (SSE streaming); instead, the chat triggers navigation to the deployment page
- Chat history persisted in localStorage

---

## Infrastructure & API Key Dependencies

| Dependency | Action |
|---|---|
| **Google Gemini API Key** | Get from [Google AI Studio](https://aistudio.google.com/apikey). Free tier supports `gemini-2.0-flash`. |
| **Environment Variable** | Add `GEMINI_API_KEY=<key>` to `.env.local` (server-only, no `NEXT_PUBLIC_` prefix) |
| **npm Package** | `@google/generative-ai` (Google's official JS SDK) |
| **App running locally** | Chat API route calls other API routes on `localhost:3000` |

---

## New File Structure

```
src/
  app/api/
    chat/route.ts                          # Gemini chat endpoint + tool-calling loop
    pipeline/
      config/route.ts                      # GET/PUT pipeline config
      steps/route.ts                       # POST new step
      steps/[stepId]/route.ts              # PATCH/DELETE step
    deployment/
      history/route.ts                     # GET deployment history
  lib/chat/
    tools.ts                               # Tool config registry (ALL tool definitions)
    gemini.ts                              # Gemini client init + system prompt builder
    types.ts                               # Chat-specific TypeScript types
  components/chat/
    ChatWidget.tsx                         # Main widget (panel + bubble)
    ChatBubble.tsx                         # Floating trigger button
    ChatMessage.tsx                        # Message renderer (user/assistant/tool)
    ChatInput.tsx                          # Text input with send
  hooks/
    useChat.ts                             # Chat state + clientAction dispatcher
```

**Files to modify:**
- `src/app/dashboard/layout.tsx` — add `<ChatWidget />` inside `<DashboardProviders>`
- `.env.local` — add `GEMINI_API_KEY`
- `package.json` — add `@google/generative-ai`

---

## Phase 1: New API Routes

These routes expose server-side operations that currently only exist client-side.

### 1A. Pipeline Config CRUD

**`src/app/api/pipeline/config/route.ts`**
- `GET` — Returns current pipeline config from Supabase (falls back to `DEFAULT_PIPELINE_CONFIG`)
- `PUT` — Replaces entire pipeline config for current user
- Auth pattern: same as existing routes (`createClient()` → `supabase.auth.getUser()`)

**`src/app/api/pipeline/steps/route.ts`**
- `POST` — Add a new step. Auto-generates `id`, sets `order = max+1`, auto-generates `endpoint` from `apiName`. Fetches current config, appends step, saves back.

**`src/app/api/pipeline/steps/[stepId]/route.ts`**
- `PATCH` — Update a specific step (merge fields)
- `DELETE` — Remove a step from config

### 1B. Deployment History

**`src/app/api/deployment/history/route.ts`**
- `GET` — List past deployments from Supabase `deployments` table
- Query params: `?status=completed&limit=20&deploymentId=xxx&details=true`
- Mirrors the client-side query in `src/app/dashboard/history/page.tsx`

### Data Entry: No New Routes Needed

Data entries live in localStorage via `ConfigDataContext`. Instead of creating API routes:
- The chat request includes `configDataState` (current entries) as context
- Tool results return `clientAction` payloads that the frontend dispatches to `ConfigDataContext`
- This avoids a new Supabase table and keeps the existing architecture intact

---

## Phase 2: Tool Config Registry

**`src/lib/chat/tools.ts`** — Single file, all tool definitions. Config-driven.

### Tool List (18 tools)

| # | Tool Name | Maps To | Type |
|---|---|---|---|
| **Salesforce Connection** |||
| 1 | `test_salesforce_connection` | `POST /api/salesforce/test` | API call |
| 2 | `list_salesforce_objects` | `GET /api/salesforce/sobjects` | API call |
| 3 | `search_salesforce_records` | `GET /api/salesforce/records` | API call |
| 4 | `check_duplicate_records` | `POST /api/salesforce/duplicate-check` | API call |
| **Pipeline Config** |||
| 5 | `get_pipeline_config` | `GET /api/pipeline/config` | API call |
| 6 | `add_pipeline_step` | `POST /api/pipeline/steps` | API call |
| 7 | `update_pipeline_step` | `PATCH /api/pipeline/steps/{stepId}` | API call |
| 8 | `delete_pipeline_step` | `DELETE /api/pipeline/steps/{stepId}` | API call |
| **Data Entry** |||
| 9 | `list_data_entries` | reads from `configDataState` in request | Client-side read |
| 10 | `add_data_entry` | → `clientAction: ADD_ENTRY` | Client-side mutation |
| 11 | `add_multiple_data_entries` | → `clientAction: ADD_ENTRIES_BATCH` | Client-side mutation |
| 12 | `update_data_entry` | → `clientAction: UPDATE_ENTRY` | Client-side mutation |
| 13 | `delete_data_entry` | → `clientAction: DELETE_ENTRY` | Client-side mutation |
| 14 | `clear_all_data_entries` | → `clientAction: CLEAR_ALL` | Client-side mutation |
| 15 | `get_entry_summary` | reads from `configDataState` in request | Client-side read |
| **Deployment** |||
| 16 | `execute_deployment` | → `clientAction: NAVIGATE_TO_DEPLOYMENT` | Navigation trigger |
| 17 | `rollback_deployment` | → `clientAction: NAVIGATE_TO_DEPLOYMENT` | Navigation trigger |
| 18 | `get_deployment_history` | `GET /api/deployment/history` | API call |

Each tool config has: `name`, `description`, `parameters` (JSON Schema), `apiRoute`, `httpMethod`, optional `clientAction`, optional `requiresStreaming`.

**`src/lib/chat/types.ts`** — Types for `ToolConfig`, `ChatMessage`, `ChatRequest`, `ChatResponse`, `ToolCallResult`.

### Adding a new feature later

To expose a new API route as a chat tool:
1. Add ~10 lines to `tools.ts` (name, description, parameters, route)
2. No other changes needed — the chat API route auto-discovers tools from the registry

---

## Phase 3: Chat API Route (`/api/chat`)

**`src/lib/chat/gemini.ts`** — Initializes Gemini client
- Model: `gemini-2.0-flash` (fast, supports function calling)
- System prompt: dynamically built with current pipeline config + data entry summary
- Converts `TOOL_CONFIGS` → Gemini `FunctionDeclaration[]`

**`src/app/api/chat/route.ts`** — Main chat endpoint

**Request:** `{ messages, configDataState, pipelineConfig, connectionId? }`
**Response:** `{ message, clientActions[] }`

### Tool-Calling Loop Algorithm

```
1. Authenticate via Supabase
2. Build system prompt with pipeline config + data summary from request
3. Convert message history → Gemini format
4. Call Gemini with function declarations
5. LOOP (max 10 iterations):
   a. If Gemini returns text → done, return response
   b. If Gemini returns function call(s):
      - clientAction tools → validate params, accumulate in clientActions[], return synthetic "success" to Gemini
      - requiresStreaming tools → accumulate NAVIGATE_TO_DEPLOYMENT action, return synthetic result to Gemini
      - Regular API tools → fetch(localhost:3000 + route) with forwarded auth cookies, return real result to Gemini
   c. Call Gemini again with function results
6. Return { message, clientActions }
```

### SSE Streaming (Deployment/Rollback) Handling

These routes return SSE streams, not JSON. The chat route does NOT execute them directly. Instead:
- Returns `clientAction: "NAVIGATE_TO_DEPLOYMENT"` with params `{ connectionId, mode }`
- Frontend navigates to `/dashboard/deployment` with pre-filled settings
- Gemini receives: "Deployment initiated. User can monitor progress on the deployment page."

---

## Phase 4: Floating Chat Widget

### `src/hooks/useChat.ts`

- State: `messages[]`, `isLoading`, `error`
- `sendMessage(text)`: POSTs to `/api/chat` with current `configDataState` + `pipelineConfig` from `useConfigData()`
- On response: processes `clientActions` by dispatching to `ConfigDataContext` (`addEntry`, `updateEntry`, `deleteEntry`, etc.)
- Navigation actions use `useRouter().push()`
- Persists `messages` in localStorage key `'rca-chat-history'`

### UI Components

**`ChatBubble.tsx`** — Fixed button, bottom-right (`fixed bottom-6 right-6 z-50`), circular, chat icon, toggles panel

**`ChatWidget.tsx`** — Panel above bubble (`fixed bottom-24 right-6 z-50 w-[400px] h-[500px]`)
- Header: "RCA Assistant" + minimize + clear history
- Body: scrollable message list
- Footer: ChatInput
- Mobile: full-screen overlay
- Slide-up animation on open

**`ChatMessage.tsx`** — Renders user (right-aligned, dark bg) and assistant (left-aligned, white bg) messages. Tool calls shown as collapsible chips (tool name + success/error indicator).

**`ChatInput.tsx`** — Auto-resizing textarea, Enter to send, Shift+Enter for newline, disabled while loading

### Integration

**`src/app/dashboard/layout.tsx`** — Single-line change:
```tsx
<DashboardProviders user={user}>
  {children}
  <ChatWidget />   {/* ← add this */}
</DashboardProviders>
```

---

## Phase 5: Verification

### End-to-End Test Script

1. `npm install @google/generative-ai` + set `GEMINI_API_KEY` in `.env.local`
2. `npm run dev`
3. Log in, ensure active Salesforce connection
4. Click chat bubble (bottom-right)
5. **Pipeline read:** "Show me my pipeline config" → lists 14 steps
6. **Pipeline write:** "Add a new step for UnitOfMeasure with fields Name (string, required) and Status (picklist: Active/Inactive)" → step appears in pipeline editor
7. **Data entry:** "Add 2 products: Laptop Pro (code LP-001) and Laptop Air (code LA-001)" → 2 entries appear on Data Entry page
8. **Data read:** "How many entries do I have?" → correct count
9. **SF query:** "Search for products named Widget in Salesforce" → returns SF records
10. **Deployment:** "Deploy to Salesforce in validation mode" → navigates to deployment page
11. **History:** "Show deployment history" → lists past deployments
12. **Persistence:** Refresh page → chat history preserved
13. **Clear:** Click clear history → messages gone

### Edge Cases

- Gemini rate limit (429) → show friendly retry message
- Auth expired → 401 → show "Session expired"
- Max 10 tool calls per request to prevent infinite loops
- Large state → send only entry counts per step as context, not full entries
- Concurrent UI + chat edits → chat reads latest state from ConfigDataContext at send time

---

## Critical Files Reference

| File | Why It Matters |
|---|---|
| `src/contexts/ConfigDataContext.tsx` | All data entry state + dispatch actions. Chat clientActions map to these. |
| `src/lib/pipeline/config.ts` | DEFAULT_PIPELINE_CONFIG + validation + helpers. Pipeline CRUD routes use this. |
| `src/types/index.ts` | PipelineStep, ColumnDefinition, DataEntry types. Tool schemas must match. |
| `src/app/api/deployment/execute-pipeline/route.ts` | Reference for auth pattern + SSE streaming. |
| `src/app/dashboard/layout.tsx` | Integration point for ChatWidget. |
