# CareerShift and LinkedIn (manual research)

Overview of gathering data and using **Claude insights**: [manual-enrichment.md](./manual-enrichment.md).

CareerShift is typically accessed through your university SSO. **Do not** commit passwords, cookies, or `storageState` files to git.

## Data collection shortcuts

On **Data collection → Add company**, type a company name. When the field is non-empty, the form shows:

- **LinkedIn companies** — opens LinkedIn company search with your typed name (full results usually require a logged-in session).
- **Open CareerShift contacts** — opens CareerShift’s Contacts Search UI (`/App/Contacts/Search`). Their SPA does **not** accept the query string in the URL, so the app cannot pre-fill search from a link alone.
- **Copy company name** — copies the name to the clipboard; switch to the CareerShift tab and paste into their search field.

After you find contacts, paste exports or snippets into the person modal **Claude insights** (artifact type **Careershift paste**) or call `POST /api/network/enrich-insights` with `careershift_text` artifacts.

## Optional: bulk export on your machine

If you need scripted export from CareerShift, use tooling **only on your own machine**, respect SSO terms, and never commit session files. One approach is local Playwright with a saved authenticated storage state, outputting JSON/CSV that you then paste into enrich-insights—not checked into this repo.
