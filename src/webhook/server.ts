import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { getConfig } from "../config/config.js";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

interface WebhookPayload {
  event: string;
  timestamp: string;
  id: string;
  status: string;
  source: {
    repository: string;
    ref: string;
  };
  target: {
    url: string;
    branchName: string;
    prUrl?: string;
  };
  summary?: string;
}

export class WebhookServer {
  private app: Hono;
  private logStream: ReturnType<typeof createWriteStream> | null = null;

  constructor() {
    this.app = new Hono();

    // Ensure logs directory exists
    const logsDir = join(process.cwd(), "logs");
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    // Create JSONL log file
    const logFile = join(
      logsDir,
      `webhooks-${new Date().toISOString().split("T")[0]}.jsonl`
    );
    this.logStream = createWriteStream(logFile, { flags: "a" });

    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get("/health", (c) => c.text("OK"));

    // Webhook endpoint
    this.app.post("/webhook", async (c) => {
      try {
        const config = getConfig();
        const signature = c.req.header("X-Webhook-Signature");
        const rawBody = await c.req.text();

        // Verify webhook signature if secret is configured
        if (config.ZROK_SHARE_URL && signature) {
          const expectedSignature = `sha256=${crypto
            .createHmac("sha256", config.ZROK_SHARE_URL)
            .update(rawBody)
            .digest("hex")}`;

          if (signature !== expectedSignature) {
            console.error("Invalid webhook signature");
            return c.text("Invalid signature", 401);
          }
        }

        const payload: WebhookPayload = JSON.parse(rawBody);

        // Log to JSONL file
        this.logStream?.write(
          JSON.stringify({
            received_at: new Date().toISOString(),
            ...payload,
          }) + "\n"
        );

        console.log(
          `Webhook received for agent ${payload.id}: ${payload.status}`
        );

        return c.text("OK");
      } catch (error) {
        console.error("Webhook processing error:", error);
        return c.text("Internal server error", 500);
      }
    });
  }

  start(port: number = 3000) {
    console.log(`Starting webhook server on port ${port}`);
    serve({
      fetch: this.app.fetch,
      port,
    });
  }

  stop() {
    this.logStream?.end();
  }
}
