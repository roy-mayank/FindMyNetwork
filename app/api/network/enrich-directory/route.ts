import { z } from "zod";

import { getDb } from "@/db/index";
import { createEnrichmentProposal } from "@/lib/network-repo";

const directoryEnrichmentSchema = z.object({
  personId: z.string().min(1),
  email: z.string().email().optional(),
  secondaryEmail: z.string().email().optional(),
  directoryProfileUrl: z.string().url().optional(),
  verificationStatus: z
    .enum(["unverified", "verified", "bounced", "unknown"])
    .optional(),
  notes: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional().default([]),
});

const trimOrNull = (value?: string) => {
  const v = value?.trim();
  return v ? v : null;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = directoryEnrichmentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const db = getDb();
  const created = await createEnrichmentProposal(db, {
    personId: input.personId,
    evidenceUrls: input.evidenceUrls ?? [],
    patch: {
      personProfiles: [
        {
          personId: input.personId,
          email: trimOrNull(input.email),
          secondaryEmail: trimOrNull(input.secondaryEmail),
          directoryProfileUrl: trimOrNull(input.directoryProfileUrl),
          verificationStatus: input.verificationStatus ?? "unverified",
          notes: trimOrNull(input.notes),
        },
      ],
    },
  });

  return Response.json({ ok: true, proposalId: created.id }, { status: 201 });
}
