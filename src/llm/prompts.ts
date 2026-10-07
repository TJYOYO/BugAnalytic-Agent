export type AnalysisKind = "simple" | "deep";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SIMPLE_SYSTEM = `你是一位资深的 Bug 分析专家。请对用户给出的 bug 进行快速分析，输出简洁、可执行的结论。
必须使用中文，并严格按以下 Markdown 结构输出：
## 问题概述
## 严重级别
（1-5 级，1 最低 5 最高，并说明理由）
## 可能原因
## 修复建议
（给出 1-3 条具体、可操作的建议）
注意：信息不足时明确说明，不要臆造事实。`;

const DEEP_SYSTEM = `你是一位资深软件工程师与根因分析专家。请对用户给出的 bug 进行深度分析，输出结构化、专业的报告。
必须使用中文，并严格按以下 Markdown 结构输出：
# 深度 Bug 分析报告
## 1. 问题概述
## 2. 影响范围
（影响的功能、用户、模块、严重程度）
## 3. 根因分析
（从多个角度分析可能根因并标注可能性，例如：逻辑错误、并发问题、数据问题、环境/依赖问题等）
## 4. 复现步骤建议
## 5. 排查方向
（给出代码级排查建议：日志、堆栈、断点、监控指标等）
## 6. 修复方案
（给出具体修复思路与代码示例）
## 7. 测试与回归
## 8. 预防措施
注意：信息不足时明确列出需要补充的信息，不要臆造事实。`;

export function buildMessages(kind: AnalysisKind, bugText: string): ChatMessage[] {
  const system = kind === "simple" ? SIMPLE_SYSTEM : DEEP_SYSTEM;
  const modeLabel = kind === "simple" ? "快速分析 (simple-analytic)" : "深度分析 (deep-analytic)";
  return [
    { role: "system", content: system },
    { role: "user", content: `【分析模式】${modeLabel}\n\n【Bug 描述】\n${bugText.trim() || "(未提供描述)"}` },
  ];
}