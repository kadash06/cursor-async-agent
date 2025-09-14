#!/usr/bin/env node

import { getConfig } from "./config.js";
import { startMcpServer } from "./mcp-server.js";
import { WebhookServer } from "./webhook-server.js";
import { startOrchestrator } from "./orchestrator.js";
import { logger } from "./logger.js";

// Validate configuration on startup, but do not exit for optional keys
const config = getConfig();
logger.error("Configuration loaded successfully");

// Start webhook server only if webhook functionality is configured
let webhookServer: WebhookServer | null = null;

if (config.ZROK_SHARE_URL) {
  webhookServer = new WebhookServer();
  webhookServer.start(config.WEBHOOK_PORT);
}

// Start MCP server (avoid noisy logs to stdout)
startMcpServer().catch((error) => {
  logger.error("Failed to start MCP server: " + (error instanceof Error ? error.message : String(error)));
  process.exit(1);
});

// Start polling orchestrator (always on)
startOrchestrator(15000);

// Graceful shutdown
process.on("SIGINT", () => {
  logger.error("Received SIGINT, shutting down...");
  webhookServer?.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.error("Received SIGTERM, shutting down...");
  webhookServer?.stop();
  process.exit(0);
});
