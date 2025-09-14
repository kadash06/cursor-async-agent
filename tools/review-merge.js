import "dotenv/config";
import { spawn } from "child_process";
import axios from "axios";

function send(proc, obj) {
  proc.stdin.write(JSON.stringify(obj) + "\n");
}

function parseJsonLines(buffer) {
  const lines = buffer.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const l of lines) {
    try {
      out.push(JSON.parse(l));
    } catch {}
  }
  return out;
}

async function callMcpTool(toolName, args, id = 3, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const server = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    server.stdout.on("data", (d) => (out += d.toString()));
    server.stderr.on("data", (d) => (err += d.toString()));
    server.on("error", reject);
    server.on("close", () => {
      const messages = parseJsonLines(out);
      for (const m of messages) {
        if (
          m.id === id &&
          m.result &&
          m.result.content &&
          m.result.content[0]?.text
        ) {
          return resolve(m.result.content[0].text);
        }
      }
      reject(new Error("No valid response received. STDERR: " + err));
    });

    setTimeout(() => {
      send(server, {
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      });
    }, 800);

    setTimeout(() => {
      try {
        server.kill();
      } catch {}
      reject(new Error("Timed out"));
    }, timeoutMs);
  });
}

async function waitForFinish(agentId, timeoutMs = 900000) {
  return new Promise((resolve, reject) => {
    const server = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";

    server.stdout.on("data", (d) => {
      out += d.toString();
      const messages = parseJsonLines(out);
      for (const m of messages) {
        if (
          m.id === 1 &&
          m.result &&
          m.result.content &&
          m.result.content[0]?.text
        ) {
          try {
            const payload = JSON.parse(m.result.content[0].text);
            server.kill();
            return resolve(payload);
          } catch {}
        }
        if (
          m.id === 2 &&
          m.result &&
          m.result.content &&
          m.result.content[0]?.text
        ) {
          try {
            const payload = JSON.parse(m.result.content[0].text || "{}");
            // Don't kill here; this is fallback read
            server.kill();
            return resolve(payload);
          } catch {}
        }
      }
    });
    server.stderr.on("data", (d) => (err += d.toString()));
    server.on("error", reject);

    // Kick off wait
    setTimeout(() => {
      send(server, {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "cursor_wait_for_finish",
          arguments: {
            agent_id: agentId,
            timeout_ms: timeoutMs,
            poll_interval_ms: 5000,
          },
        },
      });
    }, 800);

    // Absolute timeout safeguard
    setTimeout(() => {
      try {
        server.kill();
      } catch {}
      reject(new Error("Timed out waiting for finish"));
    }, timeoutMs + 60000);
  });
}

function prFromUrl(url) {
  const m = url.match(/github.com\/(.+?)\/(.+?)\/pull\/(\d+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2], number: Number(m[3]) };
}

async function createPRFromBranch(owner, repo, branchName, title, body) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error("Missing GITHUB_TOKEN");
  const api = axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  const prResp = await api.post(`/repos/${owner}/${repo}/pulls`, {
    title,
    head: branchName,
    base: "main",
    body,
    draft: false,
  });
  return prResp.data;
}

async function approveAndMerge(prUrl) {
  const gh = prFromUrl(prUrl);
  if (!gh) throw new Error("Invalid PR URL");
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error("Missing GITHUB_TOKEN");
  const api = axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  // Approve
  await api.post(`/repos/${gh.owner}/${gh.repo}/pulls/${gh.number}/reviews`, {
    event: "APPROVE",
    body: "Automated approval: CI workflow addition looks good.",
  });

  // Merge (squash)
  const mergeResp = await api.put(
    `/repos/${gh.owner}/${gh.repo}/pulls/${gh.number}/merge`,
    {
      merge_method: "squash",
    }
  );
  return mergeResp.data;
}

async function main() {
  const agentId = process.argv[2];
  if (!agentId) {
    console.error("Usage: node review-merge.js <agent_id>");
    process.exit(1);
  }

  let result;
  try {
    result = await waitForFinish(agentId);
  } catch (e) {
    console.error("Error waiting for finish:", e.message);
    process.exit(1);
  }

  if (result.timeout) {
    console.log("Timed out waiting for agent to finish.");
    return;
  }

  if (result.status !== "FINISHED") {
    console.log(`Agent not finished, status: ${result.status}`);
    return;
  }

  let prUrl = result?.target?.prUrl;

  let prData = null;

  if (!prUrl) {
    console.log(
      `Agent finished but no PR found. Reviewing branch: ${result.target.branchName}`
    );

    const repoUrl = result.source.repository;
    const repoMatch = repoUrl.match(/github\.com\/(.+?)\/(.+)/);
    if (!repoMatch) {
      console.error("Invalid repo URL");
      return;
    }
    const [, owner, repo] = repoMatch;
    const base = result.source.ref;
    const head = result.target.branchName;

    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!token) {
      console.error("Missing GITHUB_TOKEN");
      return;
    }

    const api = axios.create({
      baseURL: "https://api.github.com",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    let compareResp;
    try {
      compareResp = await api.get(
        `/repos/${owner}/${repo}/compare/${base}...${head}`
      );
    } catch (e) {
      console.error("Failed to get compare:", e.message);
      return;
    }

    const files = compareResp.data.files || [];
    let diff = "";
    files.forEach((file) => {
      diff += `File: ${file.filename} (${file.status})\n${
        file.patch || "No patch (binary?)"
      }\n\n`;
    });

    const query = `Review this code diff for the task: "${
      result.name || "Unknown task"
    }"\n\nDiff:\n${
      diff || "No changes"
    }\n\nIf the changes perfectly complete the task without any issues, respond exactly with "create the PR!". Otherwise, provide a concise explanation of what is wrong or missing and how to fix it.`;

    let reviewText;
    try {
      reviewText = await callMcpTool("ai_review", { query });
    } catch (e) {
      console.error("Failed to get AI review:", e.message);
      return;
    }

    if (reviewText.trim() === "create the PR!") {
      console.log("AI review approved, creating PR");
      const title = `Changes from ${head}`;
      const body = `Automated PR from background agent.\nAgent: ${agentId}\nBranch: ${head}\nStatus: ${result.status}\nReviewed and approved by AI.`;
      try {
        prData = await createPRFromBranch(owner, repo, head, title, body);
        prUrl = prData.html_url;
        console.log(`Created PR: ${prUrl}`);
      } catch (e) {
        console.error("Failed to create PR:", e.message);
        return;
      }
    } else {
      console.log("AI review: Changes needed\n" + reviewText);
      return;
    }
  }

  if (!prUrl) {
    console.log("No PR URL found or created.");
    return;
  }

  const merged = await approveAndMerge(prUrl);
  console.log("Merged:", JSON.stringify(merged, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
