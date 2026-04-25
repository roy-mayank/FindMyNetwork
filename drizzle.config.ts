import { defineConfig } from "drizzle-kit";

const dbPath = process.env.DATABASE_PATH ?? ".data/findmynetwork.db";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
