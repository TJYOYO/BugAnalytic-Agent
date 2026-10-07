export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}

interface DeepSeekChunk {
  choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
}

export async function chatCompletion(
  options: DeepSeekOptions,
  messages: ChatMessage[],
): Promise<string> {
  const baseUrl = (options.baseUrl ?? "https://api.deepseek.com").replace(/\/+$/, "");
  const url = `${baseUrl}/chat/completions`;
  const timeoutMs = options.timeoutMs ?? 120_000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", onAbort);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? "deepseek-chat",
        messages,
        stream: true,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `DeepSeek API 错误（${response.status} ${response.statusText}）：${detail.slice(0, 500)}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return await readSseStream(response, options.onDelta);
    }

    const data = (await response.json()) as DeepSeekChunk;
    const content = data.choices?.[0]?.message?.content ?? "";
    options.onDelta?.(content);
    return content;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

async function readSseStream(
  response: Response,
  onDelta?: (text: string) => void,
): Promise<string> {
  if (!response.body) {
    throw new Error("DeepSeek API 响应体为空");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as DeepSeekChunk;
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            onDelta?.(delta);
          }
        } catch {
          // 忽略无法解析的 SSE 片段
        }
      }
    }
  }

  return full;
}