import { getConfig } from "./config.js";
import { Octokit } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";

const MyOctokit = Octokit.plugin(retry, throttling);

function client() {
  const cfg = getConfig();
  return new MyOctokit({
    auth: cfg.GITHUB_TOKEN,
    userAgent: cfg.GITHUB_USERNAME || "cursor-async-agent",
    request: { timeout: 20000 },
    retry: { doNotRetry: [401, 403], maxRetries: 5 },
    throttle: {
      onRateLimit: (retryAfter: number, options: any, octokit: any) => {
        console.error(
          `[github] rate limit hit for ${options.method} ${options.url}; retrying after ${retryAfter}s`
        );
        return true;
      },
      onSecondaryRateLimit: (
        retryAfter: number,
        options: any,
        octokit: any
      ) => {
        console.error(
          `[github] secondary rate limit for ${options.method} ${options.url}; retrying after ${retryAfter}s`
        );
        return true;
      },
    },
  });
}

export async function getBranchHeadSha(
  owner: string,
  repo: string,
  branch: string
) {
  const api = client();
  // Align with previous behavior by resolving the ref directly
  const resp = await api.repos.getCommit({ owner, repo, ref: branch });
  return resp.data.sha as string;
}

export async function createCheckRun(
  owner: string,
  repo: string,
  name: string,
  headSha: string
) {
  const api = client();
  try {
    const resp = await api.checks.create({
      owner,
      repo,
      name,
      head_sha: headSha,
      status: "in_progress",
      started_at: new Date().toISOString(),
    });
    return resp.data as any;
  } catch (e: any) {
    const status = e?.status || e?.response?.status;
    if (status === 401 || status === 403) {
      await setCommitStatus(owner, repo, headSha, {
        state: "pending",
        context: name,
        description: "Agent running",
      });
      return { id: undefined } as any;
    }
    throw e;
  }
}

export async function updateCheckRun(
  owner: string,
  repo: string,
  checkRunId: number,
  params: {
    conclusion?:
      | "success"
      | "failure"
      | "neutral"
      | "cancelled"
      | "timed_out"
      | "action_required";
    status?: "queued" | "in_progress" | "completed";
    title?: string;
    summary?: string;
    text?: string;
  }
) {
  const api = client();
  const body: any = {};
  if (params.status) body.status = params.status;
  if (params.conclusion) body.conclusion = params.conclusion;
  if (params.status === "completed" || params.conclusion) {
    body.completed_at = new Date().toISOString();
  }
  if (params.title || params.summary || params.text) {
    body.output = {
      title: params.title || "Agent Review",
      summary: params.summary || "",
      text: params.text || "",
    };
  }
  try {
    const resp = await api.checks.update({
      owner,
      repo,
      check_run_id: checkRunId,
      ...body,
    });
    return resp.data as any;
  } catch (e: any) {
    const status = e?.status || e?.response?.status;
    if (status === 401 || status === 403) {
      throw new Error("Unauthorized for check-runs; set commit status instead");
    }
    throw e;
  }
}

export async function setCommitStatus(
  owner: string,
  repo: string,
  sha: string,
  params: {
    state: "pending" | "success" | "failure";
    context: string;
    description?: string;
    target_url?: string;
  }
) {
  const api = client();
  const resp = await api.repos.createCommitStatus({
    owner,
    repo,
    sha,
    state: params.state,
    context: params.context,
    description: params.description,
    target_url: params.target_url,
  });
  return resp.data as any;
}

export async function createPrComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string
) {
  const api = client();
  const resp = await api.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
  return resp.data as any;
}

export async function getCompareFiles(
  owner: string,
  repo: string,
  base: string,
  head: string
) {
  if (head === base) return [] as any[];
  const api = client();
  const resp = await api.repos.compareCommits({ owner, repo, base, head });
  return (resp.data as any)?.files || [];
}

export async function createPr(
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string
) {
  const api = client();
  const resp = await api.pulls.create({
    owner,
    repo,
    head,
    base,
    title,
    body,
    draft: false,
  });
  return resp.data as any;
}

export async function findOpenPrForBranch(
  owner: string,
  repo: string,
  branch: string
) {
  const api = client();
  const resp = await api.pulls.list({
    owner,
    repo,
    head: `${owner}:${branch}`,
    state: "open",
    per_page: 1,
  });
  const data = resp.data as any[];
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function mergePr(owner: string, repo: string, prNumber: number) {
  const api = client();
  const resp = await api.pulls.merge({
    owner,
    repo,
    pull_number: prNumber,
    merge_method: "merge",
  });
  return resp.data as any;
}

export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body: string
) {
  const api = client();
  const resp = await api.issues.create({ owner, repo, title, body });
  return resp.data as any;
}
