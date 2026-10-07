import * as fs from "node:fs";
import * as path from "node:path";

export type BugInputResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function resolveBugInput(raw: string): BugInputResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "请输入 Bug 描述，或使用 @<文件路径> 读取文件。" };
  }

  const filePath = trimmed.startsWith("@")
    ? trimmed.slice(1).trim()
    : trimmed.toLowerCase().startsWith("file:")
      ? trimmed.slice(5).trim()
      : null;

  if (filePath === null) {
    return { ok: true, value: trimmed };
  }

  const resolved = path.resolve(process.cwd(), filePath);
  try {
    const content = fs.readFileSync(resolved, "utf-8").trim();
    if (!content) {
      return { ok: false, error: `文件为空：${resolved}` };
    }
    return { ok: true, value: content };
  } catch {
    return { ok: false, error: `无法读取文件：${resolved}` };
  }
}