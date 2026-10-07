import * as fs from "node:fs";
import * as path from "node:path";

export interface AppConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
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

export function getConfig(): AppConfig {
  loadEnvFile();
  return {
    apiKey: (process.env.DEEPSEEK_API_KEY ?? "").trim(),
    baseUrl: (process.env.DEEPSEEK_BASE_URL ?? "").trim() || "https://api.deepseek.com",
    model: (process.env.DEEPSEEK_MODEL ?? "").trim() || "deepseek-chat",
  };
}