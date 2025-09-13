import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const configSchema = z.object({
  CURSOR_API_KEY: z.string().min(1, "CURSOR_API_KEY is required"),
  CURSOR_EMAIL: z.string().email("CURSOR_EMAIL must be a valid email"),
  CURSOR_MODEL: z.string().min(1, "CURSOR_MODEL is required"),
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
  GITHUB_USERNAME: z.string().min(1, "GITHUB_USERNAME is required"),
  XAI_API_KEY: z.string().min(1, "XAI_API_KEY is required"),
  XAI_MODEL_REASONING: z.string().min(1, "XAI_MODEL_REASONING is required"),
  XAI_MODEL_CODE: z.string().min(1, "XAI_MODEL_CODE is required"),
  MCP_TRANSPORT_TYPE: z.enum(["stdio", "http"]).default("stdio"),
  WEBHOOK_PORT: z.coerce.number().default(3000),
  ZROK_SHARE_URL: z.string().optional(),
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
