import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { cursorClient } from "./cursor-client.js";
import { getConfig } from "./config.js";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";

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
      const info = await cursorClient.getApiKeyInfo();
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
      const result = await cursorClient.listAgents(limit || 20, cursor);
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
      .describe("Optional webhook URL for status notifications"),
    webhook_secret: z
      .string()
      .optional()
      .describe("Optional webhook secret for signature verification"),
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
  async ({ prompt, repository, ref, webhook_url, webhook_secret, images }) => {
    try {
      const launchRequest = {
        prompt: {
          text: prompt,
          images: images,
        },
        source: {
          repository,
          ref: ref || "main",
        },
        webhook: webhook_url
          ? {
              url: webhook_url,
              secret: webhook_secret,
            }
          : undefined,
      };

      const result = await cursorClient.launchAgent(launchRequest);
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
