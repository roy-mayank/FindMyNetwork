import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { getDb } from "../db/index";
import { edges, nodes } from "../db/schema";
import { sampleNetwork } from "../data/sample-network";
import { edgeToStorageId, networkNodeToStorage } from "../lib/network-row-mapper";

async function main() {
  const db = getDb();
  migrate(db, { migrationsFolder: `${process.cwd()}/drizzle` });

  const [me] = await db.select().from(nodes).where(eq(nodes.id, "me")).limit(1);
  if (me) {
    console.log("Database already seeded (found `me` node). Skipping.");
    return;
  }

  for (const n of sampleNetwork.nodes) {
    const row = networkNodeToStorage(n);
    await db.insert(nodes).values(row);
  }
  for (let i = 0; i < sampleNetwork.edges.length; i++) {
    const e = sampleNetwork.edges[i];
    await db.insert(edges).values({
      id: edgeToStorageId(e, i),
      sourceId: e.source,
      targetId: e.target,
    });
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
