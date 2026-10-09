import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LangChainOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}

export async function chatCompletion(
  options: LangChainOptions,
  messages: ChatMessage[],
): Promise<string> {
  const model = new ChatOpenAI({
    apiKey: options.apiKey,
    model: options.model ?? "deepseek-chat",
    temperature: 0.7,
    timeout: options.timeoutMs ?? 120_000,
    configuration: {
      baseURL: (options.baseUrl ?? "https://api.deepseek.com").replace(/\/+$/, ""),
    },
  });

  let full = "";
  const stream = await model.stream(toLangChainMessages(messages), { signal: options.signal });
  for await (const chunk of stream) {
    const delta = typeof chunk.content === "string" ? chunk.content : "";
    if (delta) {
      full += delta;
      options.onDelta?.(delta);
    }
  }

  return full;
}

function toLangChainMessages(messages: ChatMessage[]) {
  return messages.map((message) => {
    switch (message.role) {
      case "system":
        return new SystemMessage(message.content);
      case "user":
        return new HumanMessage(message.content);
      case "assistant":
        return new AIMessage(message.content);
    }
  });
}
