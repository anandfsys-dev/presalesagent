# Salesforce RCA Configuration Tool - Project Overview

## Architecture

**Single Next.js app (NOT a monorepo)**. Both frontend and backend live in one package using Next.js App Router with API routes as the backend. Deployed to Heroku via Docker (`heroku.yml` + `Procfile`).

- **Framework**: Next.js 16.1.6 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS 3 + PostCSS
- **Database**: Supabase (auth + Postgres via `@supabase/ssr` and `@supabase/supabase-js`)
- **Deployment**: Heroku (standalone build)

---

## Folder Structure

```
presalesagent/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Global styles
│   │   ├── api/                    # Backend API routes
│   │   │   ├── auth/salesforce/    # SF OAuth callback
│   │   │   ├── deployment/
│   │   │   │   ├── execute/        # Single-step deployment
│   │   │   │   └── execute-pipeline/ # Full pipeline execution
│   │   │   └── salesforce/
│   │   │       ├── connect/        # Initiate SF OAuth
│   │   │       ├── duplicate-check/# Check for duplicate records
│   │   │       ├── records/        # CRUD SF records
│   │   │       ├── sobjects/       # Describe SF objects
│   │   │       └── test/           # Test SF connection
│   │   ├── auth/                   # Auth pages (login, signup, callback)
│   │   └── dashboard/              # Main app pages
│   │       ├── page.tsx            # Dashboard home
│   │       ├── connections/        # Manage SF org connections
│   │       ├── data-entry/         # Enter config data
│   │       ├── deployment/         # Execute deployments
│   │       ├── history/            # Deployment history
│   │       ├── pipeline/           # Visual pipeline editor
│   │       └── settings/           # App settings
│   ├── components/
│   │   ├── data-entry/             # HierarchicalDataEntry, TableDataEntry, VisualDataBuilder, SalesforceRecordPicker
│   │   ├── layout/                 # Header, Sidebar, PageHeader, DashboardProviders
│   │   ├── pipeline/               # PipelineEditor (react-flow), ObjectNode, NodeConfigPanel
│   │   └── ui/                     # Reusable UI (Button, Card, Modal, Toast, Alert, Badge, etc.)
│   ├── contexts/
│   │   └── ConfigDataContext.tsx    # Global state for config data (useReducer + localStorage persistence)
│   ├── lib/
│   │   ├── csv/generator.ts        # CSV export generation
│   │   ├── excel/parser.ts         # Excel file parsing (xlsx)
│   │   ├── pipeline/
│   │   │   ├── config.ts           # Default pipeline step definitions
│   │   │   ├── executor.ts         # Pipeline execution logic
│   │   │   └── index.ts
│   │   ├── salesforce/client.ts    # Salesforce REST API client
│   │   ├── schema/                 # Schema definitions, defaults, seed data
│   │   └── supabase/               # Supabase client (browser), server, middleware helpers
│   ├── middleware.ts               # Next.js middleware (Supabase auth session refresh)
│   └── types/index.ts             # All TypeScript interfaces (User, SalesforceConnection, PipelineStep, etc.)
├── supabase/
│   └── schema.sql                  # Database schema (tables, RLS policies)
├── public/                         # Static assets
├── MDfiles/                        # Documentation
├── package.json
├── next.config.ts
├── tailwind.config.js
├── tsconfig.json
├── heroku.yml                      # Heroku Docker deployment config
└── Procfile                        # Heroku process config
```

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `next` 16.1.6 | Full-stack framework (App Router) |
| `react` / `react-dom` 19.2.3 | UI library |
| `@supabase/supabase-js` + `@supabase/ssr` | Auth & database |
| `@xyflow/react` 12.10 | Visual pipeline editor (node graph) |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Form handling & validation |
| `xlsx` | Excel file import/export |
| `date-fns` | Date formatting |
| `uuid` | ID generation |
| `bootstrap-icons` | Icon set |
| `tailwindcss` | Utility-first CSS |

---

## API Routes Summary

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/salesforce/callback` | Handle Salesforce OAuth callback |
| `POST /api/salesforce/connect` | Initiate Salesforce OAuth flow |
| `GET /api/salesforce/test` | Test existing SF connection |
| `GET /api/salesforce/sobjects` | Describe SF objects/fields |
| `GET/POST /api/salesforce/records` | Query/create SF records |
| `POST /api/salesforce/duplicate-check` | Check for duplicate records before deploy |
| `POST /api/deployment/execute` | Execute a single deployment step |
| `POST /api/deployment/execute-pipeline` | Execute full pipeline (ordered steps) |
| `POST /api/deployment/rollback` | Rollback deployment (delete created records) |

---

## Data Flow

1. **Connect** - User connects a Salesforce org via OAuth (tokens stored encrypted in Supabase)
2. **Configure Pipeline** - Visual node editor (`@xyflow/react`) to define object dependencies
3. **Enter Data** - Table/hierarchical/visual data entry for each pipeline step
4. **Deploy** - Execute pipeline: creates/updates Salesforce records respecting dependency order
5. **History** - Track past deployments

---

## Rollback Feature

After a deployment creates records, users can click **Rollback** on the deployment page to delete all created records from Salesforce in reverse pipeline order (children before parents). The rollback uses the same streaming pattern as deployment for real-time progress feedback. Per-record failures are logged but don't stop the rollback process.

- **API**: `POST /api/deployment/rollback` — streaming endpoint in `src/app/api/deployment/rollback/route.ts`
- **UI**: Rollback button appears in the deployment page after a successful deployment with created records

### Inactivate Before Delete (`requiresInactivationBeforeDelete`)

Some Salesforce objects (e.g., `UnitOfMeasureClass`, `UsageResource`, `ProductUsageResource`, `ProductUsageGrant`, `RateCard`, `RateCardEntry`) require their `Status` field to be set to `Inactive` before they can be deleted. The `requiresInactivationBeforeDelete` flag on a `PipelineStep` controls this behavior during rollback.

- **Configuration**: Toggle "Inactivate before delete" in the pipeline editor's node config panel (`NodeConfigPanel.tsx`). Only applicable to POST-method steps.
- **Type**: `requiresInactivationBeforeDelete?: boolean` on the `PipelineStep` interface (`src/types/index.ts`)
- **Data flow**: The flag is stored in the pipeline config (Supabase), included in the deployment payload (`DeploymentPayload.steps`), emitted with `record_created` events from the execute-pipeline API, stored client-side with the created record, and sent to the rollback API.
- **Rollback behavior**: When the flag is `true`, the rollback route calls `PATCH /services/data/v{apiVersion}/sobjects/{objectType}/{id}` with `{ "Status": "Inactive" }` before issuing the `DELETE` request. PATCH-method steps (e.g., "Activate Usage Resource") are filtered out during rollback since they are updates, not creatable records.

---

## Salesforce Record Name Display (`_sfNames`)

When a user picks a Salesforce record via the record picker, the raw 18-character ID is stored in the data entry field. To improve readability, each entry can carry a `_sfNames` metadata object that maps `salesforce_id` column names to the human-readable record name returned by the picker.

- **Storage**: `_sfNames` is persisted as a property on each `DataEntry` (e.g., `{ "Pricebook2Id": "Standard Price Book" }`). It is saved alongside the entry data in `ConfigDataContext` and survives page refreshes via localStorage.
- **Write path**: When a record is selected (single or multi-select), `_sfNames` is merged into `formData` before the entry is saved. All three data-entry views handle this: `HierarchicalDataEntry`, `VisualDataBuilder`, and `TableDataEntry`.
- **Read path**: In read/display mode, each view checks `entry._sfNames[colName]` and renders the friendly name below the raw ID (styled as small green text).

---

## Current Branch & Modified Files

Branch: `presales-agent-cursor` (off `main`)

Modified files:
- `src/app/api/deployment/execute-pipeline/route.ts`
- `src/components/pipeline/NodeConfigPanel.tsx`
- `src/contexts/ConfigDataContext.tsx`
- `src/lib/pipeline/executor.ts`
- `src/types/index.ts`
