import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMessages } from "./prompts.js";

test("buildMessages 包含 Bug 内容与分析模式", () => {
  const simple = buildMessages("simple", "登录接口 500");
  assert.equal(simple.length, 2);
  assert.equal(simple[0].role, "system");
  assert.equal(simple[1].role, "user");
  assert.equal(simple[1].content.includes("登录接口 500"), true);
  assert.equal(simple[1].content.includes("simple-analytic"), true);
});

test("simple 与 deep 的系统提示不同", () => {
  const simple = buildMessages("simple", "x");
  const deep = buildMessages("deep", "x");
  assert.notEqual(simple[0].content, deep[0].content);
  assert.equal(deep[1].content.includes("deep-analytic"), true);
  assert.equal(deep[0].content.length > simple[0].content.length, true);
});