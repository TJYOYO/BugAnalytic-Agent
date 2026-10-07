import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { resolveBugInput } from "./bug-input.js";

function makeTempFile(content: string): { dir: string; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buganalytic-"));
  const file = path.join(dir, "bug.txt");
  fs.writeFileSync(file, content, "utf-8");
  return { dir, file };
}

test("直接输入 bug 文本", () => {
  const result = resolveBugInput("登录接口 500");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value, "登录接口 500");
});

test("@ 前缀读取文件", () => {
  const { dir, file } = makeTempFile("页面白屏\n控制台报错");
  const result = resolveBugInput(`@${file}`);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value, "页面白屏\n控制台报错");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("file: 前缀读取文件", () => {
  const { dir, file } = makeTempFile("应用崩溃");
  const result = resolveBugInput(`file:${file}`);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value, "应用崩溃");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("文件不存在时返回错误", () => {
  const result = resolveBugInput("@/no/such/file.txt");
  assert.equal(result.ok, false);
});

test("空输入返回错误", () => {
  const result = resolveBugInput("   ");
  assert.equal(result.ok, false);
});