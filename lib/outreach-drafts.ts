import { eq, or } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { edges, nodes, personProfile } from "@/db/schema";
import type { AppDb } from "@/lib/network-repo";

type DraftType = "short" | "detailed" | "follow_up";

type DraftInput = {
  draftType: DraftType;
  subject: string;
  body: string;
  profileVersion: string;
  promptContext: Record<string, unknown>;
};

async function readPersonalProfile() {
  const profilePath = path.join(process.cwd(), "data", "personal-profile.md");
  const content = await readFile(profilePath, "utf8");
  const firstLine = content.split("\n").find((line) => line.trim().length > 0);
  const profileVersion = firstLine?.replace(/^#\s*/, "").trim() || "default-profile";
  return { content, profileVersion };
}

function linesOf(text: string, limit: number) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export async function buildEmailDraftsForPerson(
  db: AppDb,
  personId: string,
): Promise<DraftInput[]> {
  const [personNode] = await db
    .select()
    .from(nodes)
    .where(eq(nodes.id, personId))
    .limit(1);
  if (!personNode || personNode.kind !== "person") {
    throw new Error("Person not found");
  }

  const [profile] = await db
    .select()
    .from(personProfile)
    .where(eq(personProfile.personId, personId))
    .limit(1);

  const links = await db
    .select()
    .from(edges)
    .where(or(eq(edges.sourceId, personId), eq(edges.targetId, personId)));
  const companyId =
    links.find((edge) => edge.sourceId !== personId)?.sourceId ??
    links.find((edge) => edge.targetId !== personId)?.targetId;
  const [companyNode] = companyId
    ? await db.select().from(nodes).where(eq(nodes.id, companyId)).limit(1)
    : [];

  const payload = JSON.parse(personNode.payloadJson || "{}") as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title : "Team member";
  const { content: personalProfileDoc, profileVersion } = await readPersonalProfile();
  const profileHighlights = linesOf(personalProfileDoc, 6).join(" | ");
  const fullName = personNode.label;
  const companyName = companyNode?.label ?? "your company";
  const role = title;
  const whyThem = profile?.notes?.trim() || "I admire your trajectory and would value your advice.";

  const promptContext = {
    fullName,
    companyName,
    role,
    whyThem,
    profileHighlights,
    profileVersion,
  };

  return [
    {
      draftType: "short",
      subject: `Quick hello from a fellow ${companyName} admirer`,
      body:
        `Hi ${fullName},\n\n` +
        `I hope you are doing well. I came across your work as ${role} at ${companyName} and wanted to introduce myself briefly.\n\n` +
        `I am currently preparing for next year's job search and would really value 10-15 minutes of advice on how to grow toward similar roles.\n\n` +
        `If helpful, I can share a short summary beforehand and work around your schedule.\n\n` +
        `Best,\n[Your Name]`,
      profileVersion,
      promptContext,
    },
    {
      draftType: "detailed",
      subject: `Would value your advice on my path toward ${companyName}`,
      body:
        `Hi ${fullName},\n\n` +
        `I discovered your profile while researching people doing thoughtful work in ${companyName}, and your path to ${role} stood out to me.\n\n` +
        `A bit about me: ${profileHighlights}.\n\n` +
        `I am building my search strategy for next year and trying to do it intentionally. ${whyThem}\n\n` +
        `If you are open to it, I would appreciate a short conversation about how you approached your transition, what skills mattered most, and how someone at my stage can stand out.\n\n` +
        `Thank you for considering it, and no worries at all if timing is tight.\n\n` +
        `Best regards,\n[Your Name]`,
      profileVersion,
      promptContext,
    },
    {
      draftType: "follow_up",
      subject: `Following up and happy to keep this brief`,
      body:
        `Hi ${fullName},\n\n` +
        `Wanted to follow up on my previous note in case it got buried.\n\n` +
        `I am still very interested in learning from your experience as ${role} at ${companyName}, even for a quick 10-minute chat.\n\n` +
        `If a call is not convenient, even 2-3 suggestions by email would help a lot.\n\n` +
        `Thank you again,\n[Your Name]`,
      profileVersion,
      promptContext,
    },
  ];
}
