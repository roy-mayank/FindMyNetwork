# Careershift (local session export)

Overview of gathering data and using **Claude insights**: [manual-enrichment.md](./manual-enrichment.md).

Careershift is typically accessed through your university SSO. **Do not** commit passwords, cookies, or `storageState` files to git.

## Recommended flow

1. Use the in-app **Data collection** or person modal fields to **paste** email addresses or CSV snippets you already exported from Careershift. Those go through `POST /api/network/enrich-insights` as `careershift_text` artifacts.

## Optional: Playwright on your machine

If you need bulk export:

1. Install Playwright locally (`npm init playwright@latest` in a scratch folder, or add devDependency only on your laptop).
2. Log in once with `npx playwright codegen` and save authenticated storage: `await context.storageState({ path: 'careershift-state.json' })`.
3. Run a personal script that navigates Careershift, copies visible contact rows, and writes a `.json` or `.csv` file.
4. Paste that file’s contents into the enrich-insights textarea—never upload `careershift-state.json` to a shared server.

Review your university IT acceptable-use policy before automating SSO-backed tools.
