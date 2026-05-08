# FindMyNetwork

Next.js app that renders your professional network as an interactive graph ([@xyflow/react](https://reactflow.dev/)): you at the center, linked to schools and companies, with people grouped on companies. Click a node for details; people can include LinkedIn and alumni URLs, plus enrichment controls for **Series A/B–style** data (funding rounds, company profiles, CRM fields) stored in SQLite via [Drizzle ORM](https://orm.drizzle.team/).

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (LTS recommended)
- npm (comes with Node)

## Run locally

From the project root:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI loads the graph from `GET /api/network` (SQLite under `.data/findmynetwork.db` by default).

### Commands

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Development server with hot reload           |
| `npm run build`     | Production build                             |
| `npm run start`     | Run production build locally                 |
| `npm run lint`      | ESLint                                       |
| `npm run db:generate` | Regenerate SQL migrations from `db/schema.ts` |
| `npm run db:migrate`  | Apply migrations to the SQLite file          |
| `npm run db:seed`     | One-time seed from `data/sample-network.ts` if empty |

Optional: set `DATABASE_PATH` to use a different SQLite file (absolute or relative path).

Optional **Claude enrichment** (person modal → “Claude insights”): set `ANTHROPIC_API_KEY`. Override model with `ANTHROPIC_MODEL` (defaults to `claude-3-5-haiku-latest`). Optional employer numbers: see [`data/h1b-employer-snapshots/README.md`](data/h1b-employer-snapshots/README.md). **Manual-first workflow:** [`docs/manual-enrichment.md`](docs/manual-enrichment.md).

## HTTP API

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| `GET` | `/api/network` | No | Full graph as [`NetworkData`](lib/network-types.ts) |
| `POST` | `/api/network/patch` | Bearer `FINDMYNETWORK_API_SECRET` | Apply a validated patch (`nodes`, `edges`, `companyProfiles`, `fundingRounds`, `personProfiles`, deletes). Shape: [`networkPatchSchema`](lib/network-patch-schema.ts) |
| `GET` | `/api/network/person/:id` | Bearer | Person subgraph (person + neighbors) for scripts / integrations |
| `POST` | `/api/network/proposals` | Bearer | Stage a **pending** patch (`personId?`, `patch`, `evidenceUrls`) |
| `GET` | `/api/network/proposals?personId=` | Bearer | List pending proposals for a person |
| `POST` | `/api/network/proposals/:id/apply` | Bearer | Apply one proposal by id |
| `POST` | `/api/network/enrich-insights` | No | Paste `artifacts[]` → Claude → pending [`enrichment_proposals`](db/schema.ts) patch for a person or company (`personId` xor `companyId`). Requires `ANTHROPIC_API_KEY`. |

Writes require `Authorization: Bearer <same secret>`. Set **`FINDMYNETWORK_API_SECRET`** where `next dev` / `next start` runs. **Legacy:** `FINDMYNETWORK_MCP_SECRET` is still read if the new variable is unset.

## Phase 1 pipeline (propose → apply)

1. **Create a pending proposal** from the app (person modal → **Claude insights** or directory enrichment) or by calling **`POST /api/network/proposals`** with the Bearer secret.
2. Proposals store JSON in `enrichment_proposals` with status `pending` (human-in-the-loop).
3. In the app, open a **person** node → **Apply latest proposal** merges the newest pending row for that `personId` and refreshes the graph.
4. **`POST /api/network/patch`** applies a patch immediately (same validation), skipping the proposal queue.

Prefer permitted sources for facts; record `evidenceUrls` on proposals and funding rows. Gather LinkedIn / Careershift / hiring-site text **manually**, then paste into **Claude insights** or `enrich-insights`—see [`docs/manual-enrichment.md`](docs/manual-enrichment.md).

## Customize seed data

Edit [`data/sample-network.ts`](data/sample-network.ts), then remove the SQLite file (or clear tables) and run `npm run db:seed` again. Routine edits are expected via **`POST /api/network/patch`** or the app UI after the first seed.

Built with [Next.js](https://nextjs.org/), [@xyflow/react](https://reactflow.dev/), and [Drizzle ORM](https://orm.drizzle.team/).
