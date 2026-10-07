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
  assert.deepEqual(parseCommand("quit", "menu"), { type: "exit" });
  assert.deepEqual(parseCommand("q", "idle"), { type: "exit" });
});

test("menu 中选择 1 / 2 / 3", () => {
  assert.deepEqual(parseCommand("1", "menu"), { type: "simple" });
  assert.deepEqual(parseCommand("2", "menu"), { type: "deep" });
  assert.deepEqual(parseCommand("3", "menu"), { type: "exit" });
  assert.deepEqual(parseCommand("simple-analytic", "menu"), { type: "simple" });
  assert.deepEqual(parseCommand("deep-analytic", "menu"), { type: "deep" });
});

test("无效命令返回 invalid", () => {
  assert.deepEqual(parseCommand("foo", "idle"), { type: "invalid" });
  assert.deepEqual(parseCommand("analytic", "menu"), { type: "invalid" });
  assert.deepEqual(parseCommand("4", "menu"), { type: "invalid" });
});