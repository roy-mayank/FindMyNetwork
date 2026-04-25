import { sql } from "drizzle-orm";
import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(),
  kind: text("kind", {
    enum: ["me", "entity", "company", "person"],
  }).notNull(),
  label: text("label").notNull(),
  payloadJson: text("payload_json").notNull().default("{}"),
});

export const edges = sqliteTable(
  "edges",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("edges_source_target_uq").on(t.sourceId, t.targetId)],
);

export const companyProfile = sqliteTable("company_profile", {
  companyId: text("company_id")
    .primaryKey()
    .references(() => nodes.id, { onDelete: "cascade" }),
  website: text("website"),
  crunchbaseSlug: text("crunchbase_slug"),
  employeeCountBand: text("employee_count_band"),
});

export const fundingRounds = sqliteTable(
  "funding_rounds",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    stage: text("stage", {
      enum: [
        "pre_seed",
        "seed",
        "series_a",
        "series_b",
        "series_c",
        "series_d_plus",
        "other",
      ],
    }).notNull(),
    announcedAt: text("announced_at"),
    amountUsd: text("amount_usd"),
    source: text("source", {
      enum: ["manual", "agent", "api"],
    })
      .notNull()
      .default("manual"),
    evidenceUrlsJson: text("evidence_urls_json").notNull().default("[]"),
    rawPayloadJson: text("raw_payload_json"),
  },
  (t) => [index("funding_rounds_company_idx").on(t.companyId)],
);

export const personProfile = sqliteTable("person_profile", {
  personId: text("person_id")
    .primaryKey()
    .references(() => nodes.id, { onDelete: "cascade" }),
  notes: text("notes"),
  lastOutreachAt: text("last_outreach_at"),
  enrichmentStatus: text("enrichment_status", {
    enum: ["none", "pending", "enriched", "error"],
  })
    .notNull()
    .default("none"),
});

export const enrichmentProposals = sqliteTable(
  "enrichment_proposals",
  {
    id: text("id").primaryKey(),
    personId: text("person_id").references(() => nodes.id, { onDelete: "set null" }),
    patchJson: text("patch_json").notNull(),
    evidenceUrlsJson: text("evidence_urls_json").notNull().default("[]"),
    status: text("status", {
      enum: ["pending", "applied", "rejected"],
    })
      .notNull()
      .default("pending"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [index("enrichment_proposals_person_idx").on(t.personId)],
);
