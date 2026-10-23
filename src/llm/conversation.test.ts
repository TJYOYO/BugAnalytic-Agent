import assert from "node:assert/strict";
import { test } from "node:test";
import { ConversationMemory } from "./conversation.js";

test("ConversationMemory 保留完整的用户和助手对话", () => {
  const memory = new ConversationMemory();
  memory.addExchange("登录返回 500", "请提供服务端日志。");

  assert.equal(memory.hasHistory, true);
  assert.deepEqual(memory.getMessages(), [
    { role: "user", content: "登录返回 500" },
    { role: "assistant", content: "请提供服务端日志。" },
  ]);
});

test("ConversationMemory 只保留最近的完整对话轮次", () => {
  const memory = new ConversationMemory(2);
  memory.addExchange("问题 1", "分析 1");
  memory.addExchange("问题 2", "分析 2");
  memory.addExchange("问题 3", "分析 3");

  assert.deepEqual(memory.getMessages(), [
    { role: "user", content: "问题 2" },
    { role: "assistant", content: "分析 2" },
    { role: "user", content: "问题 3" },
    { role: "assistant", content: "分析 3" },
  ]);
});

test("ConversationMemory 清空后不再保留上下文", () => {
  const memory = new ConversationMemory();
  memory.addExchange("问题", "分析");
  memory.clear();

  assert.equal(memory.hasHistory, false);
  assert.deepEqual(memory.getMessages(), []);
});
