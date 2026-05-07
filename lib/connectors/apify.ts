/**
 * Fetches Apify actor run results via the official REST API.
 * Configure APIFY_API_TOKEN in the environment. Caller supplies a completed `runId`.
 * @see https://docs.apify.com/api/v2
 */

type ApifyRunResponse = {
  data?: {
    defaultDatasetId?: string;
    status?: string;
  };
};

export async function fetchApifyDatasetItemsByRunId(runId: string): Promise<unknown[]> {
  const token = process.env.APIFY_API_TOKEN?.trim();
  if (!token) {
    throw new Error("APIFY_API_TOKEN is not set");
  }

  const runUrl = `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}?token=${encodeURIComponent(token)}`;
  const runRes = await fetch(runUrl);
  if (!runRes.ok) {
    const t = await runRes.text();
    throw new Error(t || `Apify run fetch failed: HTTP ${runRes.status}`);
  }
  const runJson = (await runRes.json()) as ApifyRunResponse;
  const datasetId = runJson.data?.defaultDatasetId;
  if (!datasetId) {
    throw new Error("Apify run response missing defaultDatasetId");
  }

  const itemsUrl = `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(token)}&format=json`;
  const itemsRes = await fetch(itemsUrl);
  if (!itemsRes.ok) {
    const t = await itemsRes.text();
    throw new Error(t || `Apify dataset items failed: HTTP ${itemsRes.status}`);
  }
  const items = (await itemsRes.json()) as unknown;
  return Array.isArray(items) ? items : [];
}
