const WIDE_CHAR_RE =
  /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F000}-\u{1FAFF}\u{FE0F}]/u;

export function visualWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width += WIDE_CHAR_RE.test(ch) ? 2 : 1;
  }
  return width;
}

function padRight(text: string, width: number): string {
  const padding = Math.max(0, width - visualWidth(text));
  return text + " ".repeat(padding);
}

export function makeBox(title: string, rows: string[], innerWidth = 54): string {
  const horizontal = "═".repeat(innerWidth + 3);
  const line = (text: string) => `  ║ ${padRight(text, innerWidth)} ║`;
  return [
    "",
    `  ╔${horizontal}╗`,
    line(title),
    `  ╠${horizontal}╣`,
    ...rows.map(line),
    `  ╚${horizontal}╝`,
    "",
  ].join("\n");
}

export const BannerText = [
  "",
  "     (\\_/)",
  "     (o o)  🐞",
  "      >^<",
  "",
  "   ██████╗ ██╗   ██╗ ██████╗ ███████╗",
  "   ██╔══██╗██║   ██║██╔════╝ ██╔════╝",
  "   ██████╔╝██║   ██║██║  ███╗███████╗",
  "   ██╔══██╗██║   ██║██║   ██║╚════██║",
  "   ██████╔╝╚██████╔╝╚██████╔╝███████║",
  "   ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝",
  "",
  "   🐞 BUG ANALYTIC AGENT —— 基于 DeepSeek 的智能 Bug 分析助手",
  "   ════════════════════════════════════════════════════════════",
  "",
].join("\n");

export const MenuText = makeBox("🐞 请选择分析模式", [
  "1. simple-analytic    快速分析（快速定位与修复建议）",
  "2. deep-analytic      深度分析（根因分析与完整报告）",
  "3. exit               退出",
]);