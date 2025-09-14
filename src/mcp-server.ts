import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getCursorClient } from "./cursor-client.js";
import { getConfig } from "./config.js";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { aiReview } from "./ai-review.js";

function randomHex(n: number = 4): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(n, "0");
}

const server = new McpServer({
  name: "cursor-async-agent",
  version: "1.0.0",
});

// Tool: Get API key information
server.tool(
  "cursor_me",
  "Get information about the current API key",
  async () => {
    try {
      const info = await getCursorClient().getApiKeyInfo();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

// Tool: List agents
server.tool(
  "cursor_list_agents",
  "List background agents for the authenticated user",
  {
    limit: z
      .number()
      .optional()
      .describe("Number of agents to return (default: 20)"),
    cursor: z
      .string()
      .optional()
      .describe("Pagination cursor from previous response"),
  },
  async ({ limit, cursor }) => {
    try {
      const result = await getCursorClient().listAgents(limit || 20, cursor);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

// Tool: Launch agent
server.tool(
  "cursor_launch_agent",
  "Launch a new background agent to work on a repository",
  {
    prompt: z.string().describe("The prompt/instruction for the agent"),
    repository: z
      .string()
      .describe("GitHub repository URL (e.g., https://github.com/owner/repo)"),
    ref: z
      .string()
      .optional()
      .describe("Git reference (branch/tag) (default: main)"),
    webhook_url: z
      .string()
      .optional()
      .describe(
        "Optional webhook URL for status notifications (ignored; server uses env)"
      ),
    webhook_secret: z
      .string()
      .optional()
      .describe("Optional webhook secret (ignored; server uses env)"),
    images: z
      .array(
        z.object({
          data: z.string().describe("Base64 encoded image data"),
          dimension: z.object({
            width: z.number(),
            height: z.number(),
          }),
        })
      )
      .optional()
      .describe("Optional images to include in the prompt"),
  },
  async ({ prompt, repository, ref, images }) => {
    try {
      const result = await getCursorClient().launchAgentWithDefaults({
        promptText: prompt,
        repository,
        ref,
        images,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

// Tool: Wait for finish
server.tool(
  "cursor_wait_for_finish",
  "Wait (polling) until an agent reaches FINISHED or ERROR; returns final status",
  {
    agent_id: z.string().describe("Background agent id, e.g., bc_abc123"),
    timeout_ms: z
      .number()
      .optional()
      .describe("Max wait in ms (default 300000)"),
    poll_interval_ms: z
      .number()
      .optional()
      .describe("Poll interval in ms (default 5000)"),
  },
  async ({ agent_id, timeout_ms, poll_interval_ms }) => {
    const deadline = Date.now() + (timeout_ms ?? 300000);
    const interval = poll_interval_ms ?? 5000;
    let last: unknown = null;
    while (Date.now() < deadline) {
      try {
        const a = await getCursorClient().getAgent(agent_id);
        last = a;
        if (a.status === "FINISHED" || a.status === "ERROR") {
          return {
            content: [{ type: "text", text: JSON.stringify(a, null, 2) }],
          };
        }
      } catch (e) {}
      await new Promise((r) => setTimeout(r, interval));
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ timeout: true, last }, null, 2),
        },
      ],
    };
  }
);

// Tool: Read webhook log
server.tool(
  "cursor_read_webhook_log",
  "Read the latest matching webhook event from local JSONL logs by agent id",
  {
    agent_id: z.string().describe("Background agent id, e.g., bc_abc123"),
  },
  async ({ agent_id }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const logsDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logsDir)) {
        return { content: [{ type: "text", text: "{}" }] };
      }
      // Read today + yesterday files (simple heuristic)
      const days = [0, 1];
      for (const d of days) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const f = path.join(
          logsDir,
          `webhooks-${date.toISOString().split("T")[0]}.jsonl`
        );
        if (!fs.existsSync(f)) continue;
        const lines = fs.readFileSync(f, "utf-8").trim().split(/\r?\n/);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const obj = JSON.parse(lines[i]);
            if (obj.id === agent_id) {
              return {
                content: [{ type: "text", text: JSON.stringify(obj, null, 2) }],
              };
            }
          } catch {}
        }
      }
      return { content: [{ type: "text", text: "{}" }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

// Tool: AI review (optional XAI-backed)
server.tool(
  "ai_review",
  "Run a terse AI code review; returns 'create the PR!' for perfect diffs or concise feedback",
  {
    query: z.string().describe("Task + diff to review"),
  },
  async ({ query }) => {
    try {
      const result = await aiReview(query);
      return {
        content: [
          {
            type: "text",
            text: result.approved ? "create the PR!" : result.feedback,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

// Resource: API Documentation
server.resource(
  "Cursor API Documentation",
  "file:///cursor-api-doc.md",
  async () => {
    try {
      // Read and combine the API documentation files
      const overview = readFileSync(
        join(process.cwd(), "cursor-api-doc/overview.md"),
        "utf-8"
      );
      const agentInfo = readFileSync(
        join(
          process.cwd(),
          "cursor-api-doc/api-endpoints/agent-informations.md"
        ),
        "utf-8"
      );
      const agentManagement = readFileSync(
        join(process.cwd(), "cursor-api-doc/api-endpoints/agent-management.md"),
        "utf-8"
      );
      const generalEndpoints = readFileSync(
        join(
          process.cwd(),
          "cursor-api-doc/api-endpoints/general-endpoints.md"
        ),
        "utf-8"
      );
      const webhook = readFileSync(
        join(process.cwd(), "cursor-api-doc/webhook.md"),
        "utf-8"
      );

      const fullDoc = [
        "# Cursor Background Agents API Documentation",
        "",
        overview,
        "",
        "## Agent Information",
        "",
        agentInfo,
        "",
        "## Agent Management",
        "",
        agentManagement,
        "",
        "## General Endpoints",
        "",
        generalEndpoints,
        "",
        "## Webhooks",
        "",
        webhook,
      ].join("\n");

      return {
        contents: [
          {
            uri: "file:///cursor-api-doc.md",
            mimeType: "text/markdown",
            text: fullDoc,
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: "file:///cursor-api-doc.md",
            mimeType: "text/plain",
            text: `Error reading documentation: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
      };
    }
  }
);

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cursor MCP server running on stdio transport");
}
