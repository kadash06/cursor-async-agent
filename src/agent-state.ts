import {
  writeFileSync,
  readFileSync,
  existsSync,
  renameSync,
  mkdirSync,
} from "fs";
import { join } from "path";

export interface AgentChain {
  originalAgentId: string;
  currentAgentId: string;
  iterations: Array<{
    agentId: string;
    branch: string;
    status: "pending" | "reviewing" | "approved" | "needs_revision";
    feedback?: string;
    timestamp: string;
    checkRunId?: number;
  }>;
  finalPrUrl?: string;
}

export class AgentStateManager {
  private stateFile = join(process.cwd(), "logs", "agent-chains.json");
  private legacyStateFile = join(process.cwd(), "agent-chains.json");
  private state: Map<string, AgentChain> = new Map();
  private agentIdIndex: Map<string, string> = new Map();

  constructor() {
    this.loadState();
  }

  private loadState() {
    // Ensure logs directory exists
    const logsDir = join(process.cwd(), "logs");
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    let loaded = false;
    if (existsSync(this.stateFile)) {
      const data = JSON.parse(readFileSync(this.stateFile, "utf-8"));
      this.state = new Map(Object.entries(data));
      loaded = true;
    } else if (existsSync(this.legacyStateFile)) {
      const data = JSON.parse(readFileSync(this.legacyStateFile, "utf-8"));
      this.state = new Map(Object.entries(data));
      loaded = true;
      // Migrate to logs location on first save
    }

    if (!loaded) return;

    // Rebuild index for O(1) lookups
    this.agentIdIndex.clear();
    for (const [key, chain] of this.state) {
      this.agentIdIndex.set(chain.originalAgentId, key);
      for (const iter of chain.iterations) {
        this.agentIdIndex.set(iter.agentId, key);
      }
    }
  }

  private saveState() {
    const obj = Object.fromEntries(this.state);
    const tempFile = `${this.stateFile}.tmp`;
    writeFileSync(tempFile, JSON.stringify(obj, null, 2));
    renameSync(tempFile, this.stateFile);
  }

  createChain(agentId: string, branch: string): void {
    const chain: AgentChain = {
      originalAgentId: agentId,
      currentAgentId: agentId,
      iterations: [
        {
          agentId,
          branch,
          status: "pending",
          timestamp: new Date().toISOString(),
        },
      ],
    };
    this.state.set(agentId, chain);
    this.agentIdIndex.set(agentId, agentId);
    this.saveState();
  }

  addIteration(
    originalAgentId: string,
    newAgentId: string,
    branch: string,
    feedback: string
  ): void {
    const chain = this.state.get(originalAgentId);
    if (!chain) throw new Error("Chain not found");

    chain.currentAgentId = newAgentId;
    chain.iterations.push({
      agentId: newAgentId,
      branch,
      status: "pending",
      feedback,
      timestamp: new Date().toISOString(),
    });
    this.agentIdIndex.set(newAgentId, originalAgentId);

    this.saveState();
  }

  getChain(agentId: string): AgentChain | undefined {
    const key = this.agentIdIndex.get(agentId);
    if (key) return this.state.get(key);
    // Fallback scan if index not present
    for (const [k, chain] of this.state) {
      if (chain.iterations.some((i) => i.agentId === agentId)) {
        this.agentIdIndex.set(agentId, k);
        return chain;
      }
    }
    return undefined;
  }

  approveAgent(agentId: string, prUrl: string): void {
    const chain = this.getChain(agentId);
    if (!chain) return;

    const iteration = chain.iterations.find((i) => i.agentId === agentId);
    if (iteration) {
      iteration.status = "approved";
      chain.finalPrUrl = prUrl;
      this.saveState();
    }
  }

  setFinalPrUrl(agentId: string, prUrl: string): void {
    const chain = this.getChain(agentId);
    if (!chain) return;
    chain.finalPrUrl = prUrl;
    this.saveState();
  }

  setCheckRunId(agentId: string, checkRunId: number): void {
    const chain = this.getChain(agentId);
    if (!chain) return;
    const iteration = chain.iterations.find((i) => i.agentId === agentId);
    if (iteration) {
      iteration.checkRunId = checkRunId;
      this.saveState();
    }
  }

  getCheckRunId(agentId: string): number | undefined {
    const chain = this.getChain(agentId);
    if (!chain) return undefined;
    const iteration = chain.iterations.find((i) => i.agentId === agentId);
    return iteration?.checkRunId;
  }

  getAllChains(): AgentChain[] {
    return Array.from(this.state.values());
  }
}

export const agentState = new AgentStateManager();
