import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import {
  buildAnalysisContext,
  resolveKeywords,
  resolveLogPaths,
  resolveRepositoryPaths,
} from "./analysis-context.js";

function makeTempDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "buganalytic-context-"));
}

test("收集 txt 和 dlt 日志并筛选多个关键词", () => {
  const directory = makeTempDirectory();
  const textLog = path.join(directory, "app.txt");
  const dltLog = path.join(directory, "vehicle.dlt");
  fs.writeFileSync(textLog, "boot complete\nERROR login timeout\nretry login\n", "utf8");
  fs.writeFileSync(dltLog, "DLT plain log: Timeout after login", "utf8");

  const paths = resolveLogPaths(`${textLog}, ${dltLog}`);
  assert.equal(paths.ok, true);
  if (!paths.ok) return;

  const context = buildAnalysisContext({
    description: "登录失败",
    logPaths: paths.value,
    keywords: resolveKeywords("login, timeout"),
    repositoryPaths: [],
  });
  assert.equal(context.ok, true);
  if (context.ok) {
    assert.match(context.value, /ERROR login timeout/);
    assert.match(context.value, /DLT plain log: Timeout after login/);
    assert.match(context.value, /login=2/);
    assert.match(context.value, /timeout=1/);
  }
  fs.rmSync(directory, { recursive: true, force: true });
});

test("递归识别日志目录且拒绝不支持的单个日志文件", () => {
  const directory = makeTempDirectory();
  const nested = path.join(directory, "nested");
  fs.mkdirSync(nested);
  fs.writeFileSync(path.join(nested, "error.txt"), "ERROR", "utf8");
  fs.writeFileSync(path.join(directory, "trace.log"), "ERROR", "utf8");

  const directoryResult = resolveLogPaths(directory);
  assert.equal(directoryResult.ok, true);
  if (directoryResult.ok) assert.deepEqual(directoryResult.value, [path.join(nested, "error.txt")]);

  const fileResult = resolveLogPaths(path.join(directory, "trace.log"));
  assert.equal(fileResult.ok, false);
  fs.rmSync(directory, { recursive: true, force: true });
});

test("按关键词从多个仓库收集源码证据", () => {
  const directory = makeTempDirectory();
  const repoA = path.join(directory, "repo-a");
  const repoB = path.join(directory, "repo-b");
  fs.mkdirSync(repoA);
  fs.mkdirSync(repoB);
  fs.writeFileSync(path.join(repoA, "login.ts"), "export function login() { throw new Error('timeout'); }", "utf8");
  fs.writeFileSync(path.join(repoB, "other.ts"), "export const retry = () => 'ok';", "utf8");

  const repositories = resolveRepositoryPaths(`${repoA};${repoB}`);
  assert.equal(repositories.ok, true);
  if (!repositories.ok) return;

  const context = buildAnalysisContext({
    description: "登录超时",
    logPaths: [],
    keywords: ["login", "timeout"],
    repositoryPaths: repositories.value,
  });
  assert.equal(context.ok, true);
  if (context.ok) {
    assert.match(context.value, /repo-a\/login\.ts/);
    assert.doesNotMatch(context.value, /repo-b\/other\.ts/);
  }
  fs.rmSync(directory, { recursive: true, force: true });
});
