import { PROVIDER_LABELS, type AppConfig, type LlmProvider } from "../config.js";
import { chatCompletion } from "./langchain.js";
import type { ChatMessage } from "./langchain.js";
import { buildMessages, type AnalysisKind } from "./prompts.js";

export interface AnalyzeOptions {
  config: AppConfig;
  provider: LlmProvider;
  kind: AnalysisKind;
  bugText: string;
  history?: ChatMessage[];
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}

export async function analyzeBug(options: AnalyzeOptions): Promise<string> {
  const { config, provider, kind, bugText, history, onDelta, signal } = options;
  const providerConfig = config.providers[provider];
  if (!providerConfig.apiKey) {
    throw new Error(
      `未配置 ${PROVIDER_LABELS[provider]} 的 ${providerConfig.apiKeyEnvName} 环境变量。请在 .env 文件或系统环境变量中配置后重试。`,
    );
  }
  const messages = buildMessages(kind, bugText, history);
  return chatCompletion(
    {
      apiKey: providerConfig.apiKey,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.model,
      onDelta,
      signal,
    },
    messages,
  );
}