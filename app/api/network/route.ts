import { getDb } from "@/db/index";
import { loadNetworkData } from "@/lib/network-repo";

export async function GET() {
  try {
    const db = getDb();
    const data = await loadNetworkData(db);
    return Response.json(data);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to load network" }, { status: 500 });
  }
}
