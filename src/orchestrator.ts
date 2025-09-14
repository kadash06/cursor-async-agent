import axios from "axios";
import { execSync } from "child_process";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import {
  getCursorClient,
  Agent,
  LaunchAgentResponse,
} from "./cursor-client.js";
import { getConfig } from "./config.js";
import { agentState } from "./agent-state.js";
import { tmpdir } from "os";
import { join } from "path";
import {
  createCheckRun,
  updateCheckRun,
  getBranchHeadSha,
  createPrComment,
  setCommitStatus,
  getCompareFiles,
  createPr,
  findOpenPrForBranch,
  mergePr,
  createIssue,
} from "./github.js";

function parseRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/?([^\/]+)\/([^\/#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

interface ReviewResult {
  approved: boolean;
  feedback?: string;
  testResults?: {
    build: boolean;
    tests: boolean;
    linting: boolean;
  };
}

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function loadProcessed(): Set<string> {
  try {
    const file = join(process.cwd(), "logs", "processed-agents.json");
    if (!existsSync(join(process.cwd(), "logs"))) {
      mkdirSync(join(process.cwd(), "logs"), { recursive: true });
    }
    if (!existsSync(file)) return new Set();
    const raw = JSON.parse(readFileSync(file, "utf-8"));
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function saveProcessed(processed: Set<string>): void {
  try {
    const logsDir = join(process.cwd(), "logs");
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    const file = join(logsDir, "processed-agents.json");
    writeFileSync(file, JSON.stringify(Array.from(processed), null, 2));
  } catch (e) {
    console.error("[orchestrator] Failed to persist processed agents:", e);
  }
}

async function performAutomatedReview(
  owner: string,
  repo: string,
  branch: string,
  base: string
): Promise<ReviewResult> {
  const cfg = getConfig();

  let buildPassed = false;
  let testsPassed = false;
  let lintPassed = false;

  let tempDir: string | null = null;

  if (!cfg.SAFE_REVIEW_MODE) {
    tempDir = makeTempDir("review-");
    try {
      // Clone the repo (public only without token)
      execSync(`git clone https://github.com/${owner}/${repo}.git ${tempDir}`, {
        stdio: "inherit",
      });

      // Checkout the agent's branch
      execSync(`git checkout ${branch}`, { stdio: "inherit", cwd: tempDir });

      try {
        // Detect package manager and run build
        if (existsSync(`${tempDir}/package.json`)) {
          execSync(`npm install`, { stdio: "inherit", cwd: tempDir });
          execSync(`npm run build`, { stdio: "inherit", cwd: tempDir });
          buildPassed = true;

          // Run tests if they exist
          try {
            execSync(`npm test`, { stdio: "inherit", cwd: tempDir });
            testsPassed = true;
          } catch (e) {
            console.error("[orchestrator] Tests failed");
          }

          // Run linting if configured
          try {
            execSync(`npm run lint`, { stdio: "inherit", cwd: tempDir });
            lintPassed = true;
          } catch (e) {
            console.error("[orchestrator] Linting failed");
          }
        }
      } catch (e) {
        console.error("[orchestrator] Build failed");
      }
    } finally {
      if (tempDir) {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }
    }
  }

  // Step 2: Use XAI for code review
  const files = await getCompareFiles(owner, repo, base, branch);
  const reviewPrompt = await generateReviewPrompt(files, {
    buildPassed,
    testsPassed,
    lintPassed,
  });

  const review = await callXAIForReview(reviewPrompt);

  return {
    approved: buildPassed && !review.hasCriticalIssues,
    feedback: review.feedback,
    testResults: {
      build: buildPassed,
      tests: testsPassed,
      linting: lintPassed,
    },
  };
}

async function generateReviewPrompt(
  files: any[],
  testResults: any
): Promise<string> {
  const fileSummaries = files
    .map((f) => `- ${f.filename}: ${f.status} (${f.changes} changes)`)
    .join("\n");

  return `
Please review the following code changes:

## Changed Files:
${fileSummaries}

## Test Results:
- Build: ${testResults.buildPassed ? "✅ Passed" : "❌ Failed"}
- Tests: ${testResults.testsPassed ? "✅ Passed" : "❌ Failed"}
- Linting: ${testResults.lintPassed ? "✅ Passed" : "❌ Failed"}

Please analyze the code changes and provide structured feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Security concerns
4. Performance implications
5. Whether the changes meet the requirements

Format your response as JSON with:
{
  "hasCriticalIssues": boolean,
  "feedback": "detailed feedback here",
  "severity": "low|medium|high"
}
  `;
}

async function callXAIForReview(prompt: string): Promise<any> {
  const cfg = getConfig();
  const response = await axios.post(
    "https://api.x.ai/v1/chat/completions",
    {
      model: cfg.XAI_MODEL_REASONING,
      messages: [
        {
          role: "system",
          content:
            "You are a code reviewer. Review the changes and provide structured feedback as JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${cfg.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  return JSON.parse(response.data.choices[0].message.content);
}

async function sendReviewFollowup(
  agent: Agent,
  feedback: string
): Promise<void> {
  // Send followup to the agent with review feedback
  const reviewPrompt = `
    Review completed. Here's the feedback from automated analysis:

    ${feedback}

    Please address these issues and improve the implementation.
    Continue working on the same branch.
  `;

  try {
    await getCursorClient().sendFollowup(agent.id, {
      text: reviewPrompt,
    });
    console.error(
      `[orchestrator] Sent followup to agent ${agent.id} with review feedback`
    );
  } catch (error: any) {
    console.error(
      `[orchestrator] Failed to send followup to ${agent.id}: ${
        error?.message || error
      }`
    );
    throw error;
  }
}

async function createReviewAgentAsFallback(
  agent: Agent,
  feedback: string
): Promise<string> {
  const repoInfo = parseRepo(agent.source.repository);
  if (!repoInfo) throw new Error("Invalid repository");

  // Create a new branch for the review iteration
  const reviewBranch = `${agent.target.branchName}-review-${Date.now()}`;

  // Launch a new agent with the review feedback
  const reviewPrompt = `
    Previous work was done on branch: ${agent.target.branchName}

    Review feedback:
    ${feedback}

    Please address the feedback and make necessary improvements.
    Start from the existing branch and create improved changes.
  `;

  const result = await getCursorClient().launchAgentWithDefaults({
    promptText: reviewPrompt,
    repository: agent.source.repository,
    ref: agent.target.branchName, // Start from the previous agent's branch
    branchNameSlug: reviewBranch,
  });

  return result.id;
}

async function createAndMergePR(agent: Agent, review: ReviewResult) {
  const cfg = getConfig();
  const repoInfo = parseRepo(agent.source.repository);
  if (!repoInfo) {
    throw new Error(`Invalid repository URL: ${agent.source.repository}`);
  }

  // Avoid duplicate PRs
  let pr = await findOpenPrForBranch(
    repoInfo.owner,
    repoInfo.repo,
    agent.target.branchName
  );

  if (!pr) {
    pr = await createPr(
      repoInfo.owner,
      repoInfo.repo,
      agent.target.branchName,
      agent.source.ref,
      `✅ Auto-approved: ${agent.target.branchName}`,
      `## Automated Review Results\n\n` +
        `- Build: ${review.testResults?.build ? "✅" : "❌"}\n` +
        `- Tests: ${review.testResults?.tests ? "✅" : "❌"}\n` +
        `- Linting: ${review.testResults?.linting ? "✅" : "❌"}\n\n` +
        `### Agent Details\n` +
        `- Agent ID: ${agent.id}\n` +
        `- Branch: ${agent.target.branchName}\n\n` +
        `### Review Feedback\n${review.feedback || "All checks passed"}`
    );
    console.error(
      `[orchestrator] Created PR ${pr.html_url} for ${agent.target.branchName}`
    );
  } else {
    console.error(
      `[orchestrator] Found existing PR #${pr.number} for ${agent.target.branchName}`
    );
  }

  // PR comment with verdict
  if (cfg.GH_COMMENTS_ENABLED) {
    const verdict = review.approved
      ? "create the PR!"
      : review.feedback || "Changes needed";
    try {
      await createPrComment(
        repoInfo.owner,
        repoInfo.repo,
        pr.number,
        `AI Review verdict: ${verdict}\n\nBranch: ${agent.target.branchName}\nAgent: ${agent.id}`
      );
    } catch (e) {
      console.error(`[orchestrator] Failed to comment on PR: ${e}`);
    }
  }

  // Auto-merge if all checks pass and auto-merge is enabled
  if (
    cfg.AUTO_MERGE_ON_APPROVAL &&
    review.testResults?.build &&
    review.approved
  ) {
    try {
      await mergePr(repoInfo.owner, repoInfo.repo, pr.number);
      console.error(`[orchestrator] Auto-merged PR #${pr.number}`);
    } catch (e) {
      console.error(
        `[orchestrator] Failed to auto-merge PR #${pr.number}: ${e}`
      );
    }
  }

  return pr;
}

async function reviewAndFollowUp(agent: Agent) {
  try {
    const repoInfo = parseRepo(agent.source.repository);
    if (!repoInfo) {
      console.error(
        `[orchestrator] Invalid repository URL: ${agent.source.repository}`
      );
      return;
    }
    const base = agent.source.ref || "main";
    const head = agent.target.branchName;

    const files = await getCompareFiles(
      repoInfo.owner,
      repoInfo.repo,
      base,
      head
    );

    // Minimal heuristic: if there are no changed files or only deletions, ask for changes; else open PR
    const changedCount = files.filter(
      (f: any) => f.status !== "removed"
    ).length;

    if (changedCount <= 0) {
      const title = `Follow-up required for agent ${agent.id} on ${head}`;
      const body = [
        `Agent ${agent.id} finished but no actionable changes were detected on branch \`${head}\`.`,
        "\nPlease push the intended changes or update the task instructions, then re-run the agent.",
      ].join("\n");
      const issue = await createIssue(
        repoInfo.owner,
        repoInfo.repo,
        title,
        body
      );
      console.error(
        `[orchestrator] Opened issue #${issue.number} to request changes for ${head}`
      );
      return;
    }

    const title = `Changes from ${head}`;
    const body = `Automated PR from background agent.\n\nAgent: ${agent.id}\nBranch: ${head}\nStatus: ${agent.status}\n`;
    const pr = await createPr(
      repoInfo.owner,
      repoInfo.repo,
      head,
      base,
      title,
      body
    );
    console.error(`[orchestrator] Created PR ${pr.html_url} for ${head}`);
  } catch (e: any) {
    console.error(
      `[orchestrator] Follow-up error for ${agent.id}: ${e?.message || e}`
    );
  }
}

export function startOrchestrator(pollMs: number = 15000) {
  console.error(`[orchestrator] Starting enhanced review orchestrator`);
  const processed = loadProcessed();

  const tick = async () => {
    try {
      const { agents } = await getCursorClient().listAgents(50);

      for (const agent of agents) {
        if (processed.has(agent.id)) continue;

        if (agent.status === "RUNNING") {
          // For running agents, we could potentially send followups during execution
          // For now, just log that the agent is running
          console.error(
            `[orchestrator] Agent ${agent.id} is RUNNING on branch ${agent.target.branchName}`
          );
          continue;
        }

        if (agent.status === "FINISHED") {
          processed.add(agent.id);
          saveProcessed(processed);

          // Create/update GitHub Check Run if enabled
          const cfg = getConfig();
          const repoInfo = parseRepo(agent.source.repository);
          let checkRunId: number | undefined = undefined;
          if (cfg.GH_CHECKS_ENABLED && repoInfo) {
            try {
              const headSha = await getBranchHeadSha(
                repoInfo.owner,
                repoInfo.repo,
                agent.target.branchName
              );
              const check = await createCheckRun(
                repoInfo.owner,
                repoInfo.repo,
                `Cursor Agent: ${agent.id}`,
                headSha
              );
              checkRunId = check.id;
              if (typeof checkRunId === "number") {
                agentState.setCheckRunId(agent.id, checkRunId);
              }
            } catch (e) {
              console.error(`[orchestrator] Failed to create check run: ${e}`);
            }
          }

          // Check if this agent is part of a review chain
          const chain = agentState.getChain(agent.id);

          if (!chain) {
            // First iteration - create chain and review
            console.error(`[orchestrator] Starting review for ${agent.id}`);
            agentState.createChain(agent.id, agent.target.branchName);

            if (!repoInfo) continue;

            // Perform automated review
            const review = await performAutomatedReview(
              repoInfo.owner,
              repoInfo.repo,
              agent.target.branchName,
              agent.source.ref
            );

            // Update check run with outcome
            if (cfg.GH_CHECKS_ENABLED && repoInfo) {
              try {
                if (checkRunId) {
                  await updateCheckRun(
                    repoInfo.owner,
                    repoInfo.repo,
                    checkRunId,
                    {
                      status: "completed",
                      conclusion: review.approved
                        ? "success"
                        : "action_required",
                      title: review.approved
                        ? "Agent review passed"
                        : "Agent review requires changes",
                      summary: review.approved
                        ? "All automated checks passed."
                        : "See feedback",
                      text: review.feedback || "",
                    }
                  );
                } else {
                  const headSha = await getBranchHeadSha(
                    repoInfo.owner,
                    repoInfo.repo,
                    agent.target.branchName
                  );
                  await setCommitStatus(
                    repoInfo.owner,
                    repoInfo.repo,
                    headSha,
                    {
                      state: review.approved ? "success" : "failure",
                      context: `Cursor Agent: ${agent.id}`,
                      description: review.approved
                        ? "Agent passed"
                        : "Agent needs changes",
                    }
                  );
                }
              } catch (e) {
                console.error(
                  `[orchestrator] Failed to update check/status: ${e}`
                );
              }
            }

            if (review.approved) {
              const pr = await createAndMergePR(agent, review);
              agentState.approveAgent(agent.id, pr.html_url);
            } else {
              try {
                await sendReviewFollowup(agent, review.feedback!);
                console.error(
                  `[orchestrator] Agent ${agent.id} will continue with review feedback`
                );
              } catch (error) {
                console.error(
                  `[orchestrator] Followup failed for ${agent.id}, creating new review agent`
                );
                const reviewAgentId = await createReviewAgentAsFallback(
                  agent,
                  review.feedback!
                );
                agentState.addIteration(
                  agent.id,
                  reviewAgentId,
                  `${agent.target.branchName}-review`,
                  review.feedback!
                );
              }
            }
          } else {
            // This is a review iteration
            console.error(
              `[orchestrator] Checking review iteration ${agent.id}`
            );

            if (!repoInfo) continue;

            // Re-review
            const review = await performAutomatedReview(
              repoInfo.owner,
              repoInfo.repo,
              agent.target.branchName,
              agent.source.ref
            );

            // Update check run outcome if exists
            if (cfg.GH_CHECKS_ENABLED && repoInfo) {
              try {
                const existingCheckId =
                  agentState.getCheckRunId(agent.id) || checkRunId;
                if (existingCheckId) {
                  await updateCheckRun(
                    repoInfo.owner,
                    repoInfo.repo,
                    existingCheckId,
                    {
                      status: "completed",
                      conclusion: review.approved
                        ? "success"
                        : "action_required",
                      title: review.approved
                        ? "Agent iteration passed"
                        : "Agent iteration requires changes",
                      summary: review.approved
                        ? "Checks passed."
                        : "See feedback",
                      text: review.feedback || "",
                    }
                  );
                } else {
                  const headSha = await getBranchHeadSha(
                    repoInfo.owner,
                    repoInfo.repo,
                    agent.target.branchName
                  );
                  await setCommitStatus(
                    repoInfo.owner,
                    repoInfo.repo,
                    headSha,
                    {
                      state: review.approved ? "success" : "failure",
                      context: `Cursor Agent: ${agent.id}`,
                      description: review.approved
                        ? "Agent passed"
                        : "Agent needs changes",
                    }
                  );
                }
              } catch (e) {
                console.error(
                  `[orchestrator] Failed to update check/status: ${e}`
                );
              }
            }

            const cfg2 = getConfig();
            if (
              review.approved ||
              chain.iterations.length >= cfg2.MAX_REVIEW_ITERATIONS
            ) {
              const pr = await createAndMergePR(agent, review);
              agentState.approveAgent(agent.id, pr.html_url);
            } else {
              try {
                await sendReviewFollowup(agent, review.feedback!);
                console.error(
                  `[orchestrator] Agent ${agent.id} will continue with review feedback (iteration ${chain.iterations.length})`
                );
              } catch (error) {
                console.error(
                  `[orchestrator] Followup failed for ${agent.id}, creating new review agent`
                );
                const reviewAgentId = await createReviewAgentAsFallback(
                  agent,
                  review.feedback!
                );
                agentState.addIteration(
                  chain.originalAgentId,
                  reviewAgentId,
                  `${agent.target.branchName}-review-${chain.iterations.length}`,
                  review.feedback!
                );
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.error(`[orchestrator] Error: ${e?.message || e}`);
    }
  };

  tick();
  setInterval(tick, pollMs);
}
