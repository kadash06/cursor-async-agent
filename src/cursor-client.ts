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

export class CursorClient {
  private client: AxiosInstance;

  constructor() {
    const config = getConfig();
    this.client = axios.create({
      baseURL: "https://api.cursor.com/v0",
      headers: {
        Authorization: `Bearer ${config.CURSOR_API_KEY}`,
        "Content-Type": "application/json",
      },
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
    const response = await this.client.post("/agents", request);
    return response.data;
  }
}

export const cursorClient = new CursorClient();
