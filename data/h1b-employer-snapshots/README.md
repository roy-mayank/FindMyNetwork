# Employer hiring snapshots (optional)

Place a file named `employers.json` in this folder to give the enrich pipeline extra **structured** hiring facts without scraping third-party sites.

## Format

Top-level object: keys are **lowercased trimmed** employer names. Values are objects:

```json
{
  "acme corp": {
    "employerName": "Acme Corp",
    "optTotalStudents": 120,
    "optRank": 42,
    "h1bApprovalsApprox": 500,
    "sourceNote": "Manually copied from public rankings on 2026-05-01; verify before relying on numbers."
  }
}
```

When you run **Claude insights** enrichment for a person linked to a company, the loader merges a matching row as an extra artifact so the model can cite numbers with provenance.

Refresh this file whenever you update your numbers from sources you are allowed to use (e.g. manual export, licensed data, or DOL public disclosures).
