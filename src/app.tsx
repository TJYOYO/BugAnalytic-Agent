import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  buildAnalysisContext,
  resolveKeywords,
  resolveLogPaths,
  resolveRepositoryPaths,
} from "./analysis-context.js";
import { resolveBugInput } from "./bug-input.js";
import { parseCommand } from "./command.js";
import { Banner } from "./components/Banner.js";
import { Menu } from "./components/Menu.js";
import { Spinner } from "./components/Spinner.js";
import { TextInput } from "./components/TextInput.js";
import { PROVIDER_LABELS, type AppConfig, type LlmProvider } from "./config.js";
import { analyzeBug } from "./llm/analyze.js";
import { ConversationMemory } from "./llm/conversation.js";
import type { AnalysisKind } from "./llm/prompts.js";
import { AnalysisMenuText, ProviderMenuText } from "./texts.js";

type Screen =
  | "idle"
  | "provider"
  | "analysis"
  | "input"
  | "logs"
  | "keywords"
  | "repositories"
  | "analyzing"
  | "result";

interface AppProps {
  config: AppConfig;
}

export function App({ config }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("idle");
  const [provider, setProvider] = useState<LlmProvider>("deepseek");
  const [kind, setKind] = useState<AnalysisKind>("simple");
  const [command, setCommand] = useState("");
  const [bugText, setBugText] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [logPaths, setLogPaths] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [hint, setHint] = useState<string | undefined>();
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | undefined>();
  const memory = useRef(new ConversationMemory());

  function quit(): void {
    console.log("exit");
    exit();
    // 兜底：若 Ink 卸载后仍有句柄残留，确保进程退出
    setTimeout(() => process.exit(0), 100);
  }

  function backToMenu(): void {
    memory.current.clear();
    setScreen("provider");
    setCommand("");
    setBugText("");
    setBugDescription("");
    setLogPaths([]);
    setKeywords([]);
    setHint(undefined);
    setResult("");
    setError(undefined);
  }

  function startInput(nextKind: AnalysisKind): void {
    memory.current.clear();
    setKind(nextKind);
    setCommand("");
    setBugText("");
    setBugDescription("");
    setLogPaths([]);
    setKeywords([]);
    setHint(undefined);
    setScreen("input");
  }

  function handleCollectionCommand(value: string): boolean {
    const lower = value.trim().toLowerCase();
    if (lower === "exit") {
      quit();
      return true;
    }
    if (lower === "menu" || lower === "back") {
      backToMenu();
      return true;
    }
    return false;
  }

  useInput((input, key) => {
    if (key.ctrl && input.toLowerCase() === "c") {
      quit();
    }
  });

  const analysisStarted = useRef(false);
  useEffect(() => {
    if (screen !== "analyzing") {
      analysisStarted.current = false;
      return;
    }
    if (analysisStarted.current) return;
    analysisStarted.current = true;

    const controller = new AbortController();
    let full = "";

    analyzeBug({
      config,
      provider,
      kind,
      bugText,
      history: memory.current.getMessages(),
      onDelta: (delta) => {
        full += delta;
        setResult(full);
      },
      signal: controller.signal,
    })
      .then((text) => {
        memory.current.addExchange(bugText, text);
        setResult(text);
        setScreen("result");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setResult("");
        setScreen("result");
      });

    return () => controller.abort();
  }, [screen, config, provider, kind, bugText]);

  return (
    <Box flexDirection="column">
      {screen === "idle" && (
        <Box flexDirection="column">
          <Banner />
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">输入 Analytic 开始分析，输入 exit 退出</Text>
            <TextInput
              value={command}
              onChange={setCommand}
              onSubmit={(value) => {
                const cmd = parseCommand(value, "idle");
                if (cmd.type === "start") {
                  setCommand("");
                  setHint(undefined);
                  setScreen("provider");
                } else if (cmd.type === "exit") {
                  quit();
                } else {
                  setHint('无效命令，请输入 "Analytic" 或 "exit"。');
                  setCommand("");
                }
              }}
              placeholder="Analytic / exit"
            />
            {hint !== undefined && <Text color="red">{hint}</Text>}
          </Box>
        </Box>
      )}

      {screen === "provider" && (
        <Box flexDirection="column">
          <Menu text={ProviderMenuText} />
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">请选择：1. DeepSeek　2. ChatGPT　3. GitHub Copilot　4. exit</Text>
            <TextInput
              value={command}
              onChange={setCommand}
              onSubmit={(value) => {
                const cmd = parseCommand(value, "provider");
                if (cmd.type === "deepseek" || cmd.type === "chatgpt" || cmd.type === "copilot") {
                  setProvider(cmd.type);
                  setHint(undefined);
                  setCommand("");
                  setScreen("analysis");
                } else if (cmd.type === "exit") {
                  quit();
                } else {
                  setHint("无效选择，请输入 1 / 2 / 3 / 4 或 exit。");
                  setCommand("");
                }
              }}
              placeholder="1 / 2 / 3 / 4 / exit"
            />
            {hint !== undefined && <Text color="red">{hint}</Text>}
          </Box>
        </Box>
      )}

      {screen === "analysis" && (
        <Box flexDirection="column">
          <Menu text={AnalysisMenuText} />
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">当前 LLM：{PROVIDER_LABELS[provider]}</Text>
            <Text color="yellow">请选择：1. simple-analytic　2. deep-analytic　3. back　4. exit</Text>
            <TextInput
              value={command}
              onChange={setCommand}
              onSubmit={(value) => {
                const cmd = parseCommand(value, "analysis");
                if (cmd.type === "simple") {
                  startInput("simple");
                } else if (cmd.type === "deep") {
                  startInput("deep");
                } else if (cmd.type === "back") {
                  setHint(undefined);
                  setCommand("");
                  setScreen("provider");
                } else if (cmd.type === "exit") {
                  quit();
                } else {
                  setHint("无效选择，请输入 1 / 2 / 3 / 4 或 exit。");
                  setCommand("");
                }
              }}
              placeholder="1 / 2 / 3 / 4 / exit"
            />
            {hint !== undefined && <Text color="red">{hint}</Text>}
          </Box>
        </Box>
      )}

      {screen === "input" && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">
            {`${PROVIDER_LABELS[provider]} · ${
              kind === "simple" ? "【1. simple-analytic】快速分析" : "【2. deep-analytic】深度分析"
            }`}
          </Text>
          <Text color="gray">
            {memory.current.hasHistory
              ? "请输入补充信息或追问（可用 @<文件路径> 读取），回车继续分析；输入 exit 退出，menu 开始新的分析。"
              : "请输入 Bug 描述（可用 @<文件路径> 读取），回车开始分析；输入 exit 退出，menu 返回菜单。"}
          </Text>
          <TextInput
            value={command}
            onChange={setCommand}
            onSubmit={(value) => {
              const lower = value.trim().toLowerCase();
              if (lower === "exit") {
                quit();
                return;
              }
              if (lower === "menu" || lower === "back") {
                backToMenu();
                return;
              }
              const input = resolveBugInput(value);
              if (!input.ok) {
                setHint(input.error);
                return;
              }
              setBugDescription(input.value);
              setHint(undefined);
              setCommand("");
              setScreen("logs");
            }}
            placeholder="Bug 描述...（或 @examples/bug-login.txt）"
          />
          {hint !== undefined && <Text color="red">{hint}</Text>}
        </Box>
      )}

      {screen === "logs" && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">【日志文件】请输入一个或多个 .dlt / .txt 文件或目录路径</Text>
          <Text color="gray">多个路径用逗号或分号分隔；输入 skip 跳过。目录会递归收集其中的 .dlt / .txt 文件。</Text>
          <TextInput
            value={command}
            onChange={setCommand}
            onSubmit={(value) => {
              if (handleCollectionCommand(value)) return;
              const logs = resolveLogPaths(value);
              if (!logs.ok) {
                setHint(logs.error);
                return;
              }
              setLogPaths(logs.value);
              setHint(undefined);
              setCommand("");
              setScreen("keywords");
            }}
            placeholder="@logs/app.dlt, @logs/error.txt / skip"
          />
          {hint !== undefined && <Text color="red">{hint}</Text>}
        </Box>
      )}

      {screen === "keywords" && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">【分析关键词】请输入一个或多个关键词</Text>
          <Text color="gray">多个关键词用逗号或分号分隔；将用于筛选日志和源码片段。输入 skip 跳过。</Text>
          <TextInput
            value={command}
            onChange={setCommand}
            onSubmit={(value) => {
              if (handleCollectionCommand(value)) return;
              setKeywords(resolveKeywords(value));
              setHint(undefined);
              setCommand("");
              setScreen("repositories");
            }}
            placeholder="timeout, login, NullPointerException / skip"
          />
          {hint !== undefined && <Text color="red">{hint}</Text>}
        </Box>
      )}

      {screen === "repositories" && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">【工程仓库】请输入一个或多个本地工程目录</Text>
          <Text color="gray">多个仓库用逗号或分号分隔；将按关键词提取相关源码片段。输入 skip 跳过。</Text>
          <TextInput
            value={command}
            onChange={setCommand}
            onSubmit={(value) => {
              if (handleCollectionCommand(value)) return;
              const repositories = resolveRepositoryPaths(value);
              if (!repositories.ok) {
                setHint(repositories.error);
                return;
              }
              const context = buildAnalysisContext({
                description: bugDescription,
                logPaths,
                keywords,
                repositoryPaths: repositories.value,
              });
              if (!context.ok) {
                setHint(context.error);
                return;
              }
              setBugText(context.value);
              setHint(undefined);
              setCommand("");
              setScreen("analyzing");
            }}
            placeholder="/workspace/service-a, /workspace/service-b / skip"
          />
          {hint !== undefined && <Text color="red">{hint}</Text>}
        </Box>
      )}

      {screen === "analyzing" && (
        <Box marginTop={1} flexDirection="column">
          <Spinner
            text={`${PROVIDER_LABELS[provider]} ${
              kind === "simple" ? "快速分析中..." : "深度分析中..."
            }`}
          />
          <Text color="gray">分析进行中，按 Ctrl+C 退出。</Text>
        </Box>
      )}

      {screen === "result" && (
        <Box marginTop={1} flexDirection="column">
          {error !== undefined ? <Text color="red">[错误] {error}</Text> : <Text>{result}</Text>}
          <Box marginTop={1}>
            <Text color="yellow">输入补充信息或追问继续当前 Bug；输入 menu 开始新的分析，exit 退出</Text>
          </Box>
          <TextInput
            value={command}
            onChange={setCommand}
            onSubmit={(value) => {
              const lower = value.trim().toLowerCase();
              if (lower === "exit") {
                quit();
                return;
              }
              if (!lower || lower === "menu" || lower === "back") {
                backToMenu();
                return;
              }
              const input = resolveBugInput(value);
              if (!input.ok) {
                setHint(input.error);
                return;
              }
              setBugText(input.value);
              setHint(undefined);
              setCommand("");
              setResult("");
              setError(undefined);
              setScreen("analyzing");
            }}
            placeholder="补充信息 / 追问 / menu / exit"
          />
          {hint !== undefined && <Text color="red">{hint}</Text>}
        </Box>
      )}
    </Box>
  );
}