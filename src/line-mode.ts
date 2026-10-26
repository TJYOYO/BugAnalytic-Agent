import * as readline from "node:readline";
import {
  buildAnalysisContext,
  resolveKeywords,
  resolveLogPaths,
  resolveRepositoryPaths,
} from "./analysis-context.js";
import { resolveBugInput } from "./bug-input.js";
import { parseCommand } from "./command.js";
import type { AppConfig } from "./config.js";
import { analyzeBug } from "./llm/analyze.js";
import { ConversationMemory } from "./llm/conversation.js";
import type { AnalysisKind } from "./llm/prompts.js";
import { BannerText, MenuText } from "./texts.js";

type LineScreen = "idle" | "menu" | "input" | "logs" | "keywords" | "repositories";

function promptFor(screen: LineScreen, hasHistory = false): void {
  if (screen === "idle") {
    process.stdout.write("\n> 输入 Analytic 开始分析，输入 exit 退出：");
  } else if (screen === "menu") {
    process.stdout.write("\n> 请选择 (1/2/3)：");
  } else if (screen === "input") {
    process.stdout.write(
      hasHistory
        ? "\n请输入补充信息或追问（支持 @<文件路径>），回车继续分析；输入 exit 退出，menu 开始新的分析："
        : "\n请输入 Bug 描述（支持 @<文件路径>），回车开始分析；输入 exit 退出，menu 返回菜单：",
    );
  } else if (screen === "logs") {
    process.stdout.write("\n请输入 .dlt / .txt 日志文件或目录路径（多个路径用逗号或分号分隔；skip 跳过）：");
  } else if (screen === "keywords") {
    process.stdout.write("\n请输入分析关键词（多个关键词用逗号或分号分隔；skip 跳过）：");
  } else {
    process.stdout.write("\n请输入本地工程仓库目录（多个仓库用逗号或分号分隔；skip 跳过）：");
  }
}

export async function runLineMode(config: AppConfig): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(BannerText);
  console.log("\n提示：当前为非交互模式（stdin 非 TTY），将使用行输入方式。");

  let screen: LineScreen = "idle";
  let kind: AnalysisKind = "simple";
  let bugDescription = "";
  let logPaths: string[] = [];
  let keywords: string[] = [];
  const memory = new ConversationMemory();

  promptFor(screen, memory.hasHistory);
  for await (const raw of rl) {
    const line = raw.trim();

    if (screen !== "idle" && screen !== "menu") {
      const lower = line.toLowerCase();
      if (lower === "exit") {
        console.log("exit");
        break;
      }
      if (lower === "menu" || lower === "back") {
        memory.clear();
        screen = "menu";
        console.log(MenuText);
        promptFor(screen, memory.hasHistory);
        continue;
      }
    }

    if (screen === "idle") {
      const cmd = parseCommand(line, "idle");
      if (cmd.type === "exit") {
        console.log("exit");
        break;
      }
      if (cmd.type === "start") {
        screen = "menu";
        console.log(MenuText);
      } else {
        console.log('无效命令，请输入 "Analytic" 或 "exit"。');
      }
    } else if (screen === "menu") {
      const cmd = parseCommand(line, "menu");
      if (cmd.type === "exit") {
        console.log("exit");
        break;
      }
      if (cmd.type === "simple" || cmd.type === "deep") {
        kind = cmd.type;
        memory.clear();
        screen = "input";
        console.log(
          kind === "simple"
            ? "已选择：1. simple-analytic（快速分析）"
            : "已选择：2. deep-analytic（深度分析）",
        );
      } else {
        console.log("无效选择，请输入 1 / 2 / 3 或 exit。");
      }
    } else if (screen === "input") {
      const lower = line.toLowerCase();
      if (lower === "exit") {
        console.log("exit");
        break;
      }
      if (lower === "menu" || lower === "back") {
        memory.clear();
        screen = "menu";
        console.log(MenuText);
      } else {
        const input = resolveBugInput(line);
        if (!input.ok) {
          console.log(input.error);
        } else {
          if (memory.hasHistory) {
            await runAnalysis(config, kind, input.value, memory);
          } else {
            bugDescription = input.value;
            screen = "logs";
          }
        }
      }
    } else if (screen === "logs") {
      const logs = resolveLogPaths(line);
      if (!logs.ok) {
        console.log(logs.error);
      } else {
        logPaths = logs.value;
        screen = "keywords";
      }
    } else if (screen === "keywords") {
      keywords = resolveKeywords(line);
      screen = "repositories";
    } else {
      const repositories = resolveRepositoryPaths(line);
      if (!repositories.ok) {
        console.log(repositories.error);
      } else {
        const context = buildAnalysisContext({
          description: bugDescription,
          logPaths,
          keywords,
          repositoryPaths: repositories.value,
        });
        if (!context.ok) {
          console.log(context.error);
        } else {
          await runAnalysis(config, kind, context.value, memory);
          screen = "input";
        }
      }
    }

    promptFor(screen, memory.hasHistory);
  }

  async function runAnalysis(
    config: AppConfig,
    kind: AnalysisKind,
    bugText: string,
    memory: ConversationMemory,
  ): Promise<void> {
    console.log("\n正在调用 DeepSeek 分析中...\n");
    try {
      const result = await analyzeBug({
        config,
        kind,
        bugText,
        history: memory.getMessages(),
      });
      memory.addExchange(bugText, result);
      console.log(`\n${result}\n`);
    } catch (error) {
      console.error(`\n[错误] ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  rl.close();
}