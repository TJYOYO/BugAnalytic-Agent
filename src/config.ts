import * as fs from "node:fs";
import * as path from "node:path";

export type LlmProvider = "deepseek" | "chatgpt" | "copilot";

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiKeyEnvName: string;
}

export interface AppConfig {
  providers: Record<LlmProvider, ProviderConfig>;
}

function loadEnvFile(): void {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(envPath);
    }
  } catch {
    // .env 读取失败时忽略，回退到系统环境变量
  }
}

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  deepseek: "DeepSeek",
  chatgpt: "ChatGPT",
  copilot: "GitHub Copilot",
};

export function createConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    providers: {
      deepseek: {
        apiKey: (env.DEEPSEEK_API_KEY ?? "").trim(),
        baseUrl: (env.DEEPSEEK_BASE_URL ?? "").trim() || "https://api.deepseek.com",
        model: (env.DEEPSEEK_MODEL ?? "").trim() || "deepseek-chat",
        apiKeyEnvName: "DEEPSEEK_API_KEY",
      },
      chatgpt: {
        apiKey: (env.OPENAI_API_KEY ?? "").trim(),
        baseUrl: (env.OPENAI_BASE_URL ?? "").trim() || "https://api.openai.com/v1",
        model: (env.OPENAI_MODEL ?? "").trim() || "gpt-4o-mini",
        apiKeyEnvName: "OPENAI_API_KEY",
      },
      copilot: {
        apiKey: (env.COPILOT_API_KEY ?? env.GITHUB_TOKEN ?? "").trim(),
        baseUrl: (env.COPILOT_BASE_URL ?? "").trim() || "https://models.github.ai/inference",
        model: (env.COPILOT_MODEL ?? "").trim() || "openai/gpt-4.1",
        apiKeyEnvName: "COPILOT_API_KEY（或 GITHUB_TOKEN）",
      },
    },
  };
}

export function getConfig(): AppConfig {
  loadEnvFile();
  return createConfig(process.env);
}