# FindMyNetwork capture (Chrome extension)

Takes a **lightweight snapshot** of the current **normal web page** (Open Graph / meta description / `h1` / `document.title` / first off-site `http(s)` link as a website guess / trimmed visible text) and POSTs it to your running FindMyNetwork app (`POST /api/captures`). On **ycombinator.com** company or jobs URLs it still sets `pageKind` hints (`yc_company` / `yc_jobs`) for the inbox.

You confirm or dismiss rows on **Collect → Inbox** in the web app.

## Setup

1. Set **`FINDMYNETWORK_API_SECRET`** in the environment where `next dev` / `next start` runs (see project [README](../README.md)).
2. In Chrome: **Extensions → Developer mode → Load unpacked** and choose this `extension/` folder.
3. Open the extension **options** (details → Extension options) and enter:
   - **App base URL** — e.g. `http://localhost:3000` or your deployed `https://…` origin
   - **API token** — the same value as `FINDMYNETWORK_API_SECRET`
4. The manifest includes **`http://*/*`** and **`https://*/*`** so the extension can run on most sites and call your API. Chrome will show a broad host warning on install; that is expected.

## Use

- On any **http(s)** page (except restricted URLs like `chrome://`, Chrome Web Store), click the **toolbar icon** to capture, or use **Save to FindMyNetwork** at the bottom-right.
- If the toolbar capture fails right after install, **reload the tab** so the content script runs.
- Open **Collect → Inbox** in the app to review, edit industry / company link, and confirm into your graph.

## Compliance

This tool only runs when you trigger it on pages you can already see. You are responsible for following each site’s terms of service and applicable law. Avoid capturing pages with sensitive data you do not want stored in your SQLite inbox payload.
