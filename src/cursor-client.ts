import axios, { AxiosInstance } from "axios";
import { getConfig } from "./config.js";

export interface Agent {
  id: string;
  name: string;
  status: "CREATING" | "RUNNING" | "FINISHED" | "ERROR";
  source: {
    repository: string;
    ref: string;
  };
  target: {
    branchName: string;
    url: string;
    autoCreatePr: boolean;
    prUrl?: string;
  };
  createdAt: string;
}

export interface AgentPhase {
  phase: "initial" | "review";
  parentAgentId?: string; // For review phase, track the original
  reviewFeedback?: string;
}

export interface LaunchAgentRequest {
  prompt: {
    text: string;
    images?: Array<{
      data: string;
      dimension: {
        width: number;
        height: number;
      };
    }>;
  };
  source: {
    repository: string;
    ref: string;
  };
  webhook?: {
    url: string;
    secret?: string;
  };
  target?: {
    autoCreatePr?: boolean;
    branchName?: string;
  };
  model?: string;
  metadata?: {
    phase: AgentPhase;
    prNumber?: number;
    previousBranch?: string;
  };
}

export interface LaunchAgentResponse {
  id: string;
  name: string;
  status: "CREATING";
  source: {
    repository: string;
    ref: string;
  };
  target: {
    branchName: string;
    url: string;
    autoCreatePr: boolean;
  };
  createdAt: string;
}

export interface ApiKeyInfo {
  apiKeyName: string;
  createdAt: string;
  userEmail?: string;
}

function randomHex(n: number = 4): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(n, "0");
}

export class CursorClient {
  private client: AxiosInstance;

  constructor() {
    const config = getConfig();
    this.client = axios.create({
      baseURL: "https://api.cursor.com/v0",
      headers: {
        Authorization: `Bearer ${config.CURSOR_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "cursor-async-agent",
      },
      timeout: 15000,
    });
  }

  async getApiKeyInfo(): Promise<ApiKeyInfo> {
    const response = await this.client.get("/me");
    return response.data;
  }

  async listAgents(
    limit = 20,
    cursor?: string
  ): Promise<{
    agents: Agent[];
    nextCursor?: string;
  }> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await this.client.get(`/agents?${params}`);
    return response.data;
  }

  async launchAgent(request: LaunchAgentRequest): Promise<LaunchAgentResponse> {
    // Always enforce autoCreatePr: true
    const req: LaunchAgentRequest = {
      ...request,
      target: {
        ...(request.target || {}),
        autoCreatePr: true,
      },
    };

    // Print payload (redact secret)
    const sanitized = {
      ...req,
      webhook: req.webhook
        ? {
            url: req.webhook.url,
            secret: req.webhook.secret ? "***redacted***" : undefined,
          }
        : undefined,
    };
    console.error(
      "[POST /agents] Payload:\n" + JSON.stringify(sanitized, null, 2)
    );
    const response = await this.client.post("/agents", req);
    return response.data;
  }

  async launchAgentWithDefaults(args: {
    promptText: string;
    repository: string;
    ref?: string;
    images?: LaunchAgentRequest["prompt"]["images"];
    branchNameSlug?: string;
  }): Promise<LaunchAgentResponse> {
    const cfg = getConfig();
    const finalBranch =
      cfg.AGENT_TARGET_BRANCH ||
      (args.branchNameSlug
        ? `${args.branchNameSlug}-${randomHex()}`
        : `feat/agent-${randomHex()}`);
    const finalWebhookUrl = cfg.ZROK_SHARE_URL
      ? `${cfg.ZROK_SHARE_URL}/webhook`
      : undefined;
    const finalWebhookSecret = cfg.WEBHOOK_SECRET;

    const request: LaunchAgentRequest = {
      prompt: { text: args.promptText, images: args.images },
      source: { repository: args.repository, ref: args.ref || "main" },
      model: cfg.CURSOR_MODEL || "grok-code-fast-1",
      target: {
        autoCreatePr: true,
        branchName: finalBranch,
      },
      webhook: finalWebhookUrl
        ? { url: finalWebhookUrl, secret: finalWebhookSecret }
        : undefined,
    };
    return this.launchAgent(request);
  }

  async getAgent(id: string): Promise<Agent> {
    const response = await this.client.get(`/agents/${encodeURIComponent(id)}`);
    return response.data;
  }

  async sendFollowup(
    agentId: string,
    prompt: {
      text: string;
      images?: Array<{
        data: string;
        dimension: {
          width: number;
          height: number;
        };
      }>;
    }
  ): Promise<{ id: string }> {
    console.error(`[POST /agents/${agentId}/followup] Sending followup...`);

    const response = await this.client.post(
      `/agents/${encodeURIComponent(agentId)}/followup`,
      { prompt }
    );
    return response.data;
  }
}

let singletonClient: CursorClient | null = null;
export function getCursorClient(): CursorClient {
  if (!singletonClient) {
    singletonClient = new CursorClient();
  }
  return singletonClient;
}
