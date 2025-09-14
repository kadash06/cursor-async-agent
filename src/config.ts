import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const coerceBool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off", ""].includes(s)) return false;
  }
  return Boolean(v);
}, z.boolean());

const configSchema = z.object({
  CURSOR_API_KEY: z.string().min(1, "CURSOR_API_KEY is required"),
  CURSOR_EMAIL: z.string().email("CURSOR_EMAIL must be a valid email"),
  CURSOR_MODEL: z.string().min(1, "CURSOR_MODEL is required"),
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
  GITHUB_USERNAME: z.string().min(1, "GITHUB_USERNAME is required"),
  XAI_API_KEY: z.string().optional(),
  XAI_MODEL_REASONING: z.string().optional(),
  XAI_MODEL_CODE: z.string().optional(),
  MCP_TRANSPORT_TYPE: z.enum(["stdio", "http"]).default("stdio"),
  WEBHOOK_PORT: z.coerce.number().default(8788),
  ZROK_SHARE_URL: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  AGENT_TARGET_BRANCH: z.string().optional(),
  MAX_REVIEW_ITERATIONS: z.coerce.number().default(3),
  AUTO_MERGE_ON_APPROVAL: coerceBool.default(false),
  SAFE_REVIEW_MODE: coerceBool.default(true),
  GH_CHECKS_ENABLED: coerceBool.default(true),
  GH_COMMENTS_ENABLED: coerceBool.default(true),
});

export type Config = z.infer<typeof configSchema>;

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Configuration validation failed:");
      result.error.errors.forEach((error) => {
        console.error(`- ${error.path.join(".")}: ${error.message}`);
      });
      process.exit(1);
    }
    config = result.data;
  }
  return config;
}
