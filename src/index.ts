#!/usr/bin/env node

import { getConfig } from "./config/config.js";
import { startMcpServer } from "./mcp/server.js";
import { WebhookServer } from "./webhook/server.js";

// Validate configuration on startup
const config = getConfig();
console.error("Configuration loaded successfully");

// Start webhook server only if webhook functionality is configured
let webhookServer: WebhookServer | null = null;

if (config.ZROK_SHARE_URL) {
  webhookServer = new WebhookServer();
  webhookServer.start(config.WEBHOOK_PORT);
}

// Start MCP server
startMcpServer().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.error("Received SIGINT, shutting down...");
  webhookServer?.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("Received SIGTERM, shutting down...");
  webhookServer?.stop();
  process.exit(0);
});
