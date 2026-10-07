import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { chatCompletion } from "./deepseek.js";

test("chatCompletion 发送请求并通过 SSE 流式返回内容", async () => {
  const sse = [
    'data: {"choices":[{"delta":{"content":"你好"}}]}',
    'data: {"choices":[{"delta":{"content":"世界"}}]}',
    "data: [DONE]",
    "",
    "",
  ].join("\n");
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sse));
      controller.close();
    },
  });

  mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(_url), "https://api.deepseek.com/chat/completions");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("authorization"), "Bearer test-key");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "deepseek-chat");
    assert.equal(body.stream, true);
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  });

  try {
    const deltas: string[] = [];
    const result = await chatCompletion(
      { apiKey: "test-key", onDelta: (text) => deltas.push(text) },
      [{ role: "user", content: "hi" }],
    );
    assert.equal(result, "你好世界");
    assert.deepEqual(deltas, ["你好", "世界"]);
  } finally {
    mock.restoreAll();
  }
});

test("chatCompletion 遇到非 2xx 抛出 API 错误", async () => {
  mock.method(
    globalThis,
    "fetch",
    async () => new Response("invalid api key", { status: 401, statusText: "Unauthorized" }),
  );
  try {
    await assert.rejects(
      () => chatCompletion({ apiKey: "bad-key" }, [{ role: "user", content: "hi" }]),
      /401/,
    );
  } finally {
    mock.restoreAll();
  }
});