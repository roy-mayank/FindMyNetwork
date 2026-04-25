/**
 * FindMyNetwork MCP server (stdio).
 * Run from repo root: npx tsx mcp/findmynetwork/src/index.ts
 * Env: FINDMYNETWORK_BASE_URL (default http://127.0.0.1:3000), FINDMYNETWORK_MCP_SECRET (required for mutating tools).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.FINDMYNETWORK_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const SECRET = process.env.FINDMYNETWORK_MCP_SECRET;

async function publicJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function authJson(path: string, init?: RequestInit): Promise<unknown> {
  if (!SECRET?.length) {
    throw new Error("FINDMYNETWORK_MCP_SECRET is required for this tool.");
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SECRET}`,
      ...init?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

const mcpServer = new McpServer({
  name: "findmynetwork",
  version: "0.1.0",
});

mcpServer.registerTool(
  "get_network",
  {
    description: "Load the full network graph (nodes and edges) from the FindMyNetwork API.",
  },
  async () => {
    const data = await publicJson("/api/network");
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "get_person",
  {
    description:
      "Load a person node plus immediate neighbors (companies, etc.) for Series A/B enrichment context. Requires MCP secret.",
    inputSchema: {
      personId: z.string().min(1).describe("Graph node id with kind person"),
    },
  },
  async ({ personId }) => {
    const data = await authJson(`/api/network/person/${encodeURIComponent(personId)}`, {
      method: "GET",
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "apply_network_patch",
  {
    description:
      "POST the same JSON body as /api/network/patch (nodes, edges, companyProfiles, fundingRounds, personProfiles, deletes). Applies directly to SQLite.",
    inputSchema: {
      networkPatchJson: z
        .string()
        .min(1)
        .describe("Stringified JSON object matching lib/network-patch-schema networkPatchSchema"),
    },
  },
  async ({ networkPatchJson }) => {
    let body: string;
    try {
      body = JSON.stringify(JSON.parse(networkPatchJson));
    } catch {
      throw new Error("networkPatchJson must be valid JSON.");
    }
    const result = await authJson("/api/network/patch", {
      method: "POST",
      body,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "propose_network_patch",
  {
    description:
      "Create a pending enrichment proposal (stores patch for later apply in UI or apply_proposal).",
    inputSchema: {
      personId: z.string().min(1).optional().describe("Person node id for filtering in the app"),
      networkPatchJson: z.string().min(1).describe("Stringified JSON patch object"),
      evidenceUrls: z.array(z.string()).optional().default([]),
    },
  },
  async ({ personId, networkPatchJson, evidenceUrls }) => {
    let patch: unknown;
    try {
      patch = JSON.parse(networkPatchJson);
    } catch {
      throw new Error("networkPatchJson must be valid JSON.");
    }
    const body = {
      personId,
      patch,
      evidenceUrls: evidenceUrls ?? [],
    };
    const result = await authJson("/api/network/proposals", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

mcpServer.registerTool(
  "apply_proposal",
  {
    description: "Apply a pending enrichment proposal by id (from propose_network_patch).",
    inputSchema: {
      proposalId: z.string().min(1),
    },
  },
  async ({ proposalId }) => {
    const result = await authJson(
      `/api/network/proposals/${encodeURIComponent(proposalId)}/apply`,
      { method: "POST" },
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
