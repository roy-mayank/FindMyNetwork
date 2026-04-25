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

## HTTP API

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| `GET` | `/api/network` | No | Full graph as [`NetworkData`](lib/network-types.ts) |
| `POST` | `/api/network/patch` | Bearer `FINDMYNETWORK_MCP_SECRET` | Apply a validated patch (`nodes`, `edges`, `companyProfiles`, `fundingRounds`, `personProfiles`, deletes). Shape: [`networkPatchSchema`](lib/network-patch-schema.ts) |
| `GET` | `/api/network/person/:id` | Bearer | Person subgraph (person + neighbors) for MCP context |
| `POST` | `/api/network/proposals` | Bearer | Stage a **pending** patch (`personId?`, `patch`, `evidenceUrls`) |
| `GET` | `/api/network/proposals?personId=` | Bearer | List pending proposals for a person |
| `POST` | `/api/network/proposals/:id/apply` | Bearer | Apply one proposal by id |

Writes require `Authorization: Bearer <same secret>`. Set `FINDMYNETWORK_MCP_SECRET` in the environment where `next dev` / `next start` runs.

## Phase 1 pipeline (propose → apply)

1. **Agent / Cursor** uses the MCP tools (below) or calls the API with the shared secret.
2. **`propose_network_patch`** stores JSON in `enrichment_proposals` with status `pending` (human-in-the-loop).
3. In the app, open a **person** node → **Apply latest proposal** runs a server action that merges the newest pending row for that `personId` and refreshes the graph.
4. **`apply_network_patch`** skips the queue and writes immediately (same validation as the API).

Prefer permitted public sources for facts; record `evidenceUrls` on proposals and funding rows. Avoid automating ToS-restricted sites (e.g. LinkedIn scraping).

## Cursor MCP

stdio server entrypoint: [`mcp/findmynetwork/src/index.ts`](mcp/findmynetwork/src/index.ts).

**Tools:** `get_network`, `get_person`, `apply_network_patch`, `propose_network_patch`, `apply_proposal`.

**Environment for the MCP process:**

- `FINDMYNETWORK_BASE_URL` — default `http://127.0.0.1:3000`
- `FINDMYNETWORK_MCP_SECRET` — must match the Next.js server

**Example Cursor MCP config** (merge into your MCP settings; adjust paths for your machine):

```json
{
  "mcpServers": {
    "findmynetwork": {
      "command": "npx",
      "args": ["tsx", "mcp/findmynetwork/src/index.ts"],
      "cwd": "C:/zMayank Roy/Programming/FindMyNetwork",
      "env": {
        "FINDMYNETWORK_BASE_URL": "http://127.0.0.1:3000",
        "FINDMYNETWORK_MCP_SECRET": "change-me"
      }
    }
  }
}
```

Use the same `FINDMYNETWORK_MCP_SECRET` value in your Next `.env` / environment when running the app.

## Customize seed data

Edit [`data/sample-network.ts`](data/sample-network.ts), then remove the SQLite file (or clear tables) and run `npm run db:seed` again. Routine edits are expected via **`POST /api/network/patch`** or MCP after the first seed.

Built with [Next.js](https://nextjs.org/), [@xyflow/react](https://reactflow.dev/), [Drizzle ORM](https://orm.drizzle.team/), and [Model Context Protocol](https://modelcontextprotocol.io/).
