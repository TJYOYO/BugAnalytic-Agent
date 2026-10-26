import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCommand } from "./command.js";

test("idle 输入 Analytic 开始", () => {
  assert.deepEqual(parseCommand("Analytic", "idle"), { type: "start" });
  assert.deepEqual(parseCommand("analytic", "idle"), { type: "start" });
  assert.deepEqual(parseCommand("  ANALYTIC  ", "idle"), { type: "start" });
});

test("exit / quit / q 均退出", () => {
  assert.deepEqual(parseCommand("exit", "idle"), { type: "exit" });
  assert.deepEqual(parseCommand("quit", "provider"), { type: "exit" });
  assert.deepEqual(parseCommand("q", "idle"), { type: "exit" });
});

test("provider 中选择 LLM", () => {
  assert.deepEqual(parseCommand("1", "provider"), { type: "deepseek" });
  assert.deepEqual(parseCommand("chatgpt", "provider"), { type: "chatgpt" });
  assert.deepEqual(parseCommand("3", "provider"), { type: "copilot" });
  assert.deepEqual(parseCommand("4", "provider"), { type: "exit" });
});

test("analysis 中选择分析模式", () => {
  assert.deepEqual(parseCommand("1", "analysis"), { type: "simple" });
  assert.deepEqual(parseCommand("2", "analysis"), { type: "deep" });
  assert.deepEqual(parseCommand("simple-analytic", "analysis"), { type: "simple" });
  assert.deepEqual(parseCommand("deep-analytic", "analysis"), { type: "deep" });
  assert.deepEqual(parseCommand("3", "analysis"), { type: "back" });
  assert.deepEqual(parseCommand("4", "analysis"), { type: "exit" });
});

test("无效命令返回 invalid", () => {
  assert.deepEqual(parseCommand("foo", "idle"), { type: "invalid" });
  assert.deepEqual(parseCommand("analytic", "provider"), { type: "invalid" });
  assert.deepEqual(parseCommand("5", "analysis"), { type: "invalid" });
});