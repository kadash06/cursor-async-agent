import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { getConfig } from "./config.js";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { agentState } from "./agent-state.js";
import { verify } from "@octokit/webhooks-methods";

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
        const signature = c.req.header("X-Webhook-Signature") || "";
        const rawBody = await c.req.text();

        // Verify webhook signature if secret is configured
        if (config.WEBHOOK_SECRET) {
          if (!signature) {
            console.error("Missing webhook signature");
            return c.text("Invalid signature", 401);
          }
          const ok = await verify(config.WEBHOOK_SECRET, rawBody, signature);
          if (!ok) {
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

        console.error(
          `Webhook received for agent ${payload.id}: ${payload.status}`
        );

        // Sync PR URL into local state if present
        if (payload?.target?.prUrl) {
          agentState.setFinalPrUrl(payload.id, payload.target.prUrl);
        }

        // If PR URL is available, this is where we could post back to GitHub
        // with a status comment. Keeping it minimal for now per request.

        return c.text("OK");
      } catch (error) {
        console.error("Webhook processing error:", error);
        return c.text("Internal server error", 500);
      }
    });
  }

  start(port: number = 8787) {
    console.error(`Starting webhook server on port ${port}`);
    serve({
      fetch: this.app.fetch,
      port,
    });
  }

  stop() {
    this.logStream?.end();
  }
}
