import type { AppConfig } from "../config.js";
import { chatCompletion } from "./deepseek.js";
import { buildMessages, type AnalysisKind } from "./prompts.js";

export interface AnalyzeOptions {
  config: AppConfig;
  kind: AnalysisKind;
  bugText: string;
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}

export async function analyzeBug(options: AnalyzeOptions): Promise<string> {
  const { config, kind, bugText, onDelta, signal } = options;
  if (!config.apiKey) {
    throw new Error("未配置 DEEPSEEK_API_KEY 环境变量。请设置环境变量或在 .env 文件中配置后重试。");
  }
  const messages = buildMessages(kind, bugText);
  return chatCompletion(
    {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      onDelta,
      signal,
    },
    messages,
  );
}