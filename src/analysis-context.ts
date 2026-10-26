import * as fs from "node:fs";
import * as path from "node:path";

const LOG_EXTENSIONS = new Set([".dlt", ".txt"]);
const SOURCE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".go",
  ".gradle",
  ".h",
  ".hpp",
  ".java",
  ".js",
  ".json",
  ".kt",
  ".kts",
  ".properties",
  ".py",
  ".ts",
  ".tsx",
  ".xml",
  ".yaml",
  ".yml",
]);
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".idea",
  ".next",
  ".svn",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
]);
const MAX_LOG_FILES = 50;
const MAX_SOURCE_FILES = 20;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_DLT_MESSAGES = 500;

export interface AnalysisContextInput {
  description: string;
  logPaths: string[];
  keywords: string[];
  repositoryPaths: string[];
}

export type ContextResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export type PathResult =
  | { ok: true; value: string[] }
  | { ok: false; error: string };

export function resolveKeywords(raw: string): string[] {
  return [...new Set(splitValues(raw).map((value) => value.trim()).filter(Boolean))];
}

export function resolveLogPaths(raw: string, cwd = process.cwd()): PathResult {
  const requested = splitValues(raw);
  if (requested.length === 0) {
    return { ok: true, value: [] };
  }

  try {
    const files: string[] = [];
    for (const requestedPath of requested) {
      const resolved = resolvePath(requestedPath, cwd);
      if (!fs.existsSync(resolved)) {
        return { ok: false, error: `日志路径不存在：${resolved}` };
      }

      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        const discovered = findFiles(resolved, (filePath) => isSupportedLog(filePath));
        files.push(...discovered);
      } else if (stat.isFile() && isSupportedLog(resolved)) {
        files.push(resolved);
      } else {
        return {
          ok: false,
          error: `仅支持 .dlt 或 .txt 日志文件：${resolved}`,
        };
      }
    }

    const uniqueFiles = unique(files);
    if (uniqueFiles.length === 0) {
      return { ok: false, error: "未在指定路径中找到 .dlt 或 .txt 日志文件。" };
    }
    if (uniqueFiles.length > MAX_LOG_FILES) {
      return {
        ok: false,
        error: `日志文件数量超过上限 ${MAX_LOG_FILES}，请缩小指定范围。`,
      };
    }

    return { ok: true, value: uniqueFiles };
  } catch (error) {
    return { ok: false, error: `无法读取日志路径：${error instanceof Error ? error.message : String(error)}` };
  }
}

export function resolveRepositoryPaths(raw: string, cwd = process.cwd()): PathResult {
  const requested = splitValues(raw);
  if (requested.length === 0) {
    return { ok: true, value: [] };
  }

  try {
    const repositories = unique(requested.map((value) => resolvePath(value, cwd)));
    for (const repository of repositories) {
      if (!fs.existsSync(repository) || !fs.statSync(repository).isDirectory()) {
        return { ok: false, error: `工程仓库目录不存在：${repository}` };
      }
    }
    return { ok: true, value: repositories };
  } catch (error) {
    return { ok: false, error: `无法读取工程仓库目录：${error instanceof Error ? error.message : String(error)}` };
  }
}

export function buildAnalysisContext(input: AnalysisContextInput): ContextResult {
  const description = input.description.trim();
  if (!description) {
    return { ok: false, error: "请输入 Bug 描述。" };
  }

  try {
    const sections = [
      `【Bug 描述】\n${description}`,
      formatKeywords(input.keywords),
      formatLogs(input.logPaths, input.keywords),
      formatRepositories(input.repositoryPaths, input.keywords),
    ];
    return { ok: true, value: sections.join("\n\n") };
  } catch (error) {
    return {
      ok: false,
      error: `准备分析上下文失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function splitValues(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "skip" || trimmed === "-") {
    return [];
  }
  return trimmed
    .split(/[,\n;]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function resolvePath(value: string, cwd: string): string {
  const pathValue = value.startsWith("@") ? value.slice(1).trim() : value;
  return path.resolve(cwd, pathValue);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isSupportedLog(filePath: string): boolean {
  return LOG_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function findFiles(directory: string, include: (filePath: string) => boolean): string[] {
  const result: string[] = [];
  const pending = [directory];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) pending.push(entryPath);
      } else if (entry.isFile() && include(entryPath)) {
        result.push(entryPath);
      }
    }
  }
  return result.sort();
}

function formatKeywords(keywords: string[]): string {
  return keywords.length > 0
    ? `【指定关键词】\n${keywords.map((keyword) => `- ${keyword}`).join("\n")}`
    : "【指定关键词】\n未指定；请优先关注日志中的 ERROR、WARN、FATAL、Exception 和失败状态。";
}

function formatLogs(logPaths: string[], keywords: string[]): string {
  if (logPaths.length === 0) {
    return "【日志证据】\n未提供日志文件。";
  }

  const evidence = logPaths.map((logPath) => {
    const content = readLog(logPath);
    const excerpt = extractRelevantLines(content, keywords, 120);
    const summary = summarizeKeywordMatches(content, keywords);
    return [
      `### ${logPath}`,
      summary,
      "```text",
      excerpt || "(未发现匹配的日志行)",
      "```",
    ].join("\n");
  });

  return `【日志证据】\n${evidence.join("\n\n")}`;
}

function readLog(filePath: string): string {
  const descriptor = fs.openSync(filePath, "r");
  try {
    const stat = fs.fstatSync(descriptor);
    const size = Math.min(stat.size, MAX_FILE_BYTES);
    const buffer = Buffer.alloc(size);
    fs.readSync(descriptor, buffer, 0, size, 0);
    const truncated = stat.size > MAX_FILE_BYTES ? "\n[日志已按大小截断]\n" : "";
    const content = path.extname(filePath).toLowerCase() === ".dlt" ? decodeDlt(buffer) : buffer.toString("utf8");
    return `${content}${truncated}`;
  } finally {
    fs.closeSync(descriptor);
  }
}

function decodeDlt(buffer: Buffer): string {
  if (buffer.subarray(0, 4).toString("ascii") !== "DLT\u0001") {
    return buffer.toString("utf8");
  }

  const messages: string[] = [];
  let offset = 0;
  while (offset + 20 <= buffer.length && messages.length < MAX_DLT_MESSAGES) {
    const marker = buffer.indexOf("DLT\u0001", offset, "ascii");
    if (marker === -1 || marker + 20 > buffer.length) break;

    const seconds = buffer.readUInt32BE(marker + 4);
    const micros = buffer.readUInt32BE(marker + 8);
    const storageEcu = printable(buffer.subarray(marker + 12, marker + 16));
    const standardOffset = marker + 16;
    const headerType = buffer[standardOffset];
    const messageLength = buffer.readUInt16BE(standardOffset + 2);
    const messageEnd = standardOffset + messageLength;
    if (messageLength < 4 || messageEnd > buffer.length) {
      offset = marker + 4;
      continue;
    }

    let payloadOffset = standardOffset + 4;
    if (headerType & 0x04) payloadOffset += 4;
    if (headerType & 0x08) payloadOffset += 4;
    if (headerType & 0x10) payloadOffset += 4;
    let application = "";
    if (headerType & 0x01) {
      if (payloadOffset + 10 > messageEnd) {
        offset = messageEnd;
        continue;
      }
      application = ` apid=${printable(buffer.subarray(payloadOffset + 2, payloadOffset + 6))} ctid=${printable(buffer.subarray(payloadOffset + 6, payloadOffset + 10))}`;
      payloadOffset += 10;
    }

    const payload = printable(buffer.subarray(payloadOffset, messageEnd)) || "<binary payload>";
    messages.push(`[${seconds}.${String(micros).padStart(6, "0")}] ecu=${storageEcu}${application} ${payload}`);
    offset = messageEnd;
  }

  return messages.length > 0 ? messages.join("\n") : buffer.toString("utf8");
}

function printable(buffer: Buffer): string {
  return buffer
    .toString("utf8")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeKeywordMatches(content: string, keywords: string[]): string {
  if (keywords.length === 0) {
    return "关键词：未指定（提取 ERROR/WARN/FATAL/Exception/失败信号）";
  }
  const normalized = content.toLowerCase();
  return `关键词命中行数：${keywords
    .map((keyword) => `${keyword}=${normalized.split(keyword.toLowerCase()).length - 1}`)
    .join("，")}`;
}

function extractRelevantLines(content: string, keywords: string[], maxLines: number): string {
  const lines = content.split(/\r?\n/);
  const terms =
    keywords.length > 0
      ? keywords.map((keyword) => keyword.toLowerCase())
      : ["error", "warn", "warning", "fatal", "exception", "failed", "failure"];
  const selected = new Set<number>();

  lines.forEach((line, index) => {
    const normalized = line.toLowerCase();
    if (terms.some((term) => normalized.includes(term))) {
      for (let current = Math.max(0, index - 2); current <= Math.min(lines.length - 1, index + 2); current += 1) {
        selected.add(current);
      }
    }
  });

  return [...selected]
    .sort((left, right) => left - right)
    .slice(0, maxLines)
    .map((index) => `${index + 1}: ${lines[index]}`)
    .join("\n");
}

function formatRepositories(repositoryPaths: string[], keywords: string[]): string {
  if (repositoryPaths.length === 0) {
    return "【源码证据】\n未提供工程仓库。";
  }
  if (keywords.length === 0) {
    return `【源码证据】\n已指定仓库：\n${repositoryPaths.map((repository) => `- ${repository}`).join("\n")}\n未指定关键词，因此未提取源码片段。`;
  }

  const matches: string[] = [];
  for (const repository of repositoryPaths) {
    const files = findFiles(repository, (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
    for (const filePath of files) {
      if (matches.length >= MAX_SOURCE_FILES) break;
      const content = readSourceFile(filePath);
      if (!content || (!containsKeyword(content, keywords) && !containsKeyword(path.basename(filePath), keywords))) {
        continue;
      }
      const excerpt = extractRelevantLines(content, keywords, 30);
      matches.push(`### ${filePath}\n\`\`\`text\n${excerpt || "(仅文件名匹配关键词)"}\n\`\`\``);
    }
  }

  return matches.length > 0
    ? `【源码证据】\n${matches.join("\n\n")}`
    : `【源码证据】\n已搜索 ${repositoryPaths.length} 个仓库，未找到包含指定关键词的支持文件。`;
}

function readSourceFile(filePath: string): string {
  const descriptor = fs.openSync(filePath, "r");
  try {
    const stat = fs.fstatSync(descriptor);
    const size = Math.min(stat.size, MAX_FILE_BYTES);
    const buffer = Buffer.alloc(size);
    fs.readSync(descriptor, buffer, 0, size, 0);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(descriptor);
  }
}

function containsKeyword(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}
