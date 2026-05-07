import type { NextRequest } from "next/server";

/** Prefer FINDMYNETWORK_API_SECRET; legacy FINDMYNETWORK_MCP_SECRET still supported. */
export function apiWriteSecret(): string | undefined {
  const next = process.env.FINDMYNETWORK_API_SECRET?.trim();
  if (next) return next;
  return process.env.FINDMYNETWORK_MCP_SECRET?.trim();
}

export function authorizeWriteRequest(request: NextRequest): Response | null {
  const secret = apiWriteSecret();
  if (!secret) {
    return Response.json(
      {
        error:
          "FINDMYNETWORK_API_SECRET is not configured on the server (legacy: FINDMYNETWORK_MCP_SECRET).",
      },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
