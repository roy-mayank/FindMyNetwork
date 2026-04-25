import type { NextRequest } from "next/server";

export function mcpSecret(): string | undefined {
  return process.env.FINDMYNETWORK_MCP_SECRET;
}

export function authorizeMcpRequest(request: NextRequest): Response | null {
  const secret = mcpSecret();
  if (!secret) {
    return Response.json(
      { error: "FINDMYNETWORK_MCP_SECRET is not configured on the server." },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
