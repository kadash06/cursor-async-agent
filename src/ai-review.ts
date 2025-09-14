import axios from "axios";
import { getConfig } from "./config.js";

export interface AiReviewOutcome {
  approved: boolean;
  feedback: string;
}

/**
 * Returns exactly "create the PR!" when the diff is perfect (per model), else concise feedback.
 * If XAI is not configured, returns a safe fallback requiring manual review.
 */
export async function aiReview(query: string): Promise<AiReviewOutcome> {
  const cfg = getConfig();
  if (!cfg.XAI_API_KEY || !cfg.XAI_MODEL_REASONING) {
    return {
      approved: false,
      feedback: "No XAI configured; manual review required.",
    };
  }

  const system =
    "You are a terse code reviewer. If the changes perfectly complete the task, respond exactly: create the PR! Otherwise, provide a concise explanation of issues and fixes.";

  const resp = await axios.post(
    "https://api.x.ai/v1/chat/completions",
    {
      model: cfg.XAI_MODEL_REASONING,
      messages: [
        { role: "system", content: system },
        { role: "user", content: query },
      ],
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${cfg.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  const text = (resp.data?.choices?.[0]?.message?.content || "").trim();
  if (text === "create the PR!") {
    return { approved: true, feedback: text };
  }
  return { approved: false, feedback: text || "Review incomplete" };
}

