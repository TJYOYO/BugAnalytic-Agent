import * as readline from "node:readline";
import { resolveBugInput } from "./bug-input.js";
import { parseCommand } from "./command.js";
import type { AppConfig } from "./config.js";
import { analyzeBug } from "./llm/analyze.js";
import type { AnalysisKind } from "./llm/prompts.js";
import { BannerText, MenuText } from "./texts.js";

type LineScreen = "idle" | "menu" | "input";

function promptFor(screen: LineScreen): void {
  if (screen === "idle") {
    process.stdout.write("\n> 输入 Analytic 开始分析，输入 exit 退出：");
  } else if (screen === "menu") {
    process.stdout.write("\n> 请选择 (1/2/3)：");
  } else {
    process.stdout.write(
      "\n请输入 Bug 描述（支持 @<文件路径>），回车开始分析；输入 exit 退出，menu 返回菜单：",
    );
  }
}

export async function runLineMode(config: AppConfig): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(BannerText);
  console.log("\n提示：当前为非交互模式（stdin 非 TTY），将使用行输入方式。");

  let screen: LineScreen = "idle";
  let kind: AnalysisKind = "simple";

  promptFor(screen);
  for await (const raw of rl) {
    const line = raw.trim();

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
        screen = "input";
        console.log(
          kind === "simple"
            ? "已选择：1. simple-analytic（快速分析）"
            : "已选择：2. deep-analytic（深度分析）",
        );
      } else {
        console.log("无效选择，请输入 1 / 2 / 3 或 exit。");
      }
    } else {
      const lower = line.toLowerCase();
      if (lower === "exit") {
        console.log("exit");
        break;
      }
      if (lower === "menu" || lower === "back") {
        screen = "menu";
        console.log(MenuText);
      } else {
        const input = resolveBugInput(line);
        if (!input.ok) {
          console.log(input.error);
        } else {
          console.log("\n正在调用 DeepSeek 分析中...\n");
          try {
            const result = await analyzeBug({ config, kind, bugText: input.value });
            console.log(`\n${result}\n`);
          } catch (error) {
            console.error(`\n[错误] ${error instanceof Error ? error.message : String(error)}\n`);
          }
          screen = "menu";
          console.log(MenuText);
        }
      }
    }

    promptFor(screen);
  }

  rl.close();
}