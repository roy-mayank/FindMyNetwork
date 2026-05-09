# FindMyNetwork

A **personal network CRM** with an interactive graph: you at the center, linked to industries, companies, and people. Capture companies and contacts from the **Collect** flow, queue **browser snapshots** via a Chrome extension and confirm them in an **inbox** before they hit the graph, and enrich people with optional **Claude**-assisted proposals (human-in-the-loop).

**Demo:** _Coming soon — video or live link will be added here._

## Why this exists

- **Low-friction capture:** Save a tab from the extension; triage when you have energy on **Collect → Inbox**.
- **Structured graph:** Explore relationships on the **Graph** view ([@xyflow/react](https://reactflow.dev/)).
- **Ops-minded data:** SQLite + [Drizzle ORM](https://orm.drizzle.team/), funding-style fields, outreach helpers.

## Architecture (high level)

| Piece | Role |
| ----- | ---- |
| **Next.js** (`app/`) | UI, API routes, server actions for inbox |
| **SQLite** | Single-tenant graph + `pending_captures` + enrichment tables |
| **Chrome extension** (`extension/`) | User-triggered page snapshot → `POST /api/captures` |
| **Bearer secret** | Protects extension ingest and other write APIs (see [Security](#security-and-deployment)) |

## Who should run this

- **You, locally or on your own server:** intended default. Single database, single operator.
- **Public multi-user SaaS:** not supported yet — the data model and auth are single-tenant (see [Roadmap](#roadmap)).

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (LTS recommended)
- npm (comes with Node)

## Environment variables

Create **`.env.local`** (never commit it). Use a long random string for the API secret; the same value goes into the extension options as the Bearer token.

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `FINDMYNETWORK_API_SECRET` | **Yes** (for extension + authenticated API writes) | Bearer token for `POST /api/captures`, `PATCH`-style routes, etc. Legacy: `FINDMYNETWORK_MCP_SECRET` is still read if unset. |
| `DATABASE_PATH` | No | SQLite file path (default: `.data/findmynetwork.db`) |
| `ANTHROPIC_API_KEY` | No | Claude enrichment (person/company insights) |
| `ANTHROPIC_MODEL` | No | Override model (default: `claude-3-5-haiku-latest`) |

## Run locally

From the project root:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI loads the graph from `GET /api/network`.

### Commands

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate SQL migrations from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the SQLite file |
| `npm run db:seed` | One-time seed from `data/sample-network.ts` if empty |

Optional employer snapshots for H-1B-style signals: [`data/h1b-employer-snapshots/README.md`](data/h1b-employer-snapshots/README.md). **Manual-first enrichment workflow:** [`docs/manual-enrichment.md`](docs/manual-enrichment.md).

## Browser extension and capture inbox

1. Set `FINDMYNETWORK_API_SECRET` on the server and paste the **same** value into the extension options (see [`extension/README.md`](extension/README.md)).
2. Load the unpacked extension from [`extension/`](extension/).
3. On a normal `http(s)` page, use the **toolbar action** or the **Save to FindMyNetwork** button (where injected).
4. Open **Collect → Inbox** in the app to **confirm** or **dismiss** before data is merged into the graph.

The extension snapshots **Open Graph / meta / title / visible text** (with extra URL hints on Y Combinator). You are responsible for complying with sites you capture from.

## HTTP API

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| `GET` | `/api/network` | No | Full graph as [`NetworkData`](lib/network-types.ts) |
| `POST` | `/api/network/patch` | Bearer `FINDMYNETWORK_API_SECRET` | Validated graph patch ([`networkPatchSchema`](lib/network-patch-schema.ts)) |
| `POST` | `/api/captures` | Bearer | Queue extension capture ([`captureIngestSchema`](lib/pending-capture-ingest.ts)); confirm at **`/collect/inbox`** |
| `GET` | `/api/network/person/:id` | Bearer | Person subgraph |
| `POST` | `/api/network/proposals` | Bearer | Stage pending enrichment proposal |
| `GET` | `/api/network/proposals?personId=` | Bearer | List pending proposals |
| `POST` | `/api/network/proposals/:id/apply` | Bearer | Apply proposal |
| `POST` | `/api/network/enrich-insights` | No | Claude → pending proposals; requires `ANTHROPIC_API_KEY` |

Authenticated writes use `Authorization: Bearer <secret>`.

**Note:** `POST /api/network/manual` (Collect forms) and `GET /api/network` are **unauthenticated** today. **Do not expose a shared instance to the internet** without adding auth or network restrictions — treat this as a **trusted local / personal** deployment.

## Security and deployment

- **Secrets:** Keep API keys and `.env.local` out of git. If a secret was ever committed or shared, **rotate** `FINDMYNETWORK_API_SECRET` and update the extension.
- **Extension token:** The MV3 extension stores the Bearer value like an API key — fine for a **personal** device; for strangers using **your** hosted app you would replace this with per-user auth (not implemented).
- **SQLite on PaaS:** Serverless hosts often lack durable local disk; for production you may need a VM with a volume or a hosted database. See discussions in issues or your own hosting notes when you add them.

## Phase 1 pipeline (propose → apply)

1. Create a **pending proposal** from the UI (Claude insights / directory enrichment) or `POST /api/network/proposals`.
2. Rows live in `enrichment_proposals` until applied or rejected.
3. In the person modal, **Apply latest proposal** merges the patch into the graph.
4. `POST /api/network/patch` applies immediately without the queue.

Prefer permitted sources; record `evidenceUrls` where the schema supports it. See [`docs/manual-enrichment.md`](docs/manual-enrichment.md).

## Roadmap (ideas for public / multi-user)

- Per-user accounts and **isolated** graph data (`userId` on all rows or DB-per-user).
- Replace shared extension secret with **OAuth** or short-lived **user tokens**.
- Lock down or remove unauthenticated **`/api/network`** / **`manual`** on public deployments.
- Hosted DB (Postgres, Turso, etc.) if SQLite on disk is not viable on the target host.

## Customize seed data

Edit [`data/sample-network.ts`](data/sample-network.ts), remove or reset the SQLite file, then run `npm run db:seed` again. Day-to-day edits are via the UI or `POST /api/network/patch`.

## License

Not specified yet. Before open-sourcing, add a `LICENSE` file (e.g. MIT) and update this section.

---

Built with [Next.js](https://nextjs.org/), [@xyflow/react](https://reactflow.dev/), and [Drizzle ORM](https://orm.drizzle.team/).
