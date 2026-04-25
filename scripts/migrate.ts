import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { getDb } from "../db/index";

async function main() {
  const db = getDb();
  migrate(db, { migrationsFolder: `${process.cwd()}/drizzle` });
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
