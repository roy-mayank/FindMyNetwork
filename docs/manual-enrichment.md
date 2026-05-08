# Manual-first enrichment

FindMyNetwork does **not** automatically scrape LinkedIn, Careershift, MyVisaJobs, or h1bdata. You gather text or exports **yourself** (respect each site’s terms of use), then bring the data into the app.

## Flow

1. **Collect** snippets: profile text, Careershift contact export, OPT/H-1B table rows, etc.
2. **Paste** in the person modal under **Claude insights** (artifact type describes what you pasted), or call **`POST /api/network/enrich-insights`** with a JSON body (`personId` or `companyId`, `artifacts[]`).
3. The server runs **Claude** (requires `ANTHROPIC_API_KEY`) and creates a **pending** row in `enrichment_proposals`.
4. In the UI, **review** and **Apply latest proposal** (or apply a specific id via `POST /api/network/proposals/:id/apply` with `Authorization: Bearer` and `FINDMYNETWORK_API_SECRET`).

## Optional helpers

- **Structured employer numbers:** add [`data/h1b-employer-snapshots/employers.json`](../data/h1b-employer-snapshots/README.md). Matching keys (normalized company name) are merged as an extra artifact during enrich for people/companies.

## Careershift

See [careershift-local.md](./careershift-local.md) for Data collection shortcuts, paste-first usage, and optional local export notes.

## API secret

Mutating HTTP routes use **`Authorization: Bearer`** plus **`FINDMYNETWORK_API_SECRET`** (legacy: `FINDMYNETWORK_MCP_SECRET` if the new name is unset). See the main [README](../README.md) HTTP API table.
