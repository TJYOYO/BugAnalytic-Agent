import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { resolveBugInput } from "./bug-input.js";
import { parseCommand } from "./command.js";
import { Banner } from "./components/Banner.js";
import { Menu } from "./components/Menu.js";
import { Spinner } from "./components/Spinner.js";
import { TextInput } from "./components/TextInput.js";
import type { AppConfig } from "./config.js";
import { analyzeBug } from "./llm/analyze.js";
import type { AnalysisKind } from "./llm/prompts.js";

type Screen = "idle" | "menu" | "input" | "analyzing" | "result";

interface AppProps {
  config: AppConfig;
}

export function App({ config }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("idle");
  const [kind, setKind] = useState<AnalysisKind>("simple");
  const [command, setCommand] = useState("");
  const [bugText, setBugText] = useState("");
  const [hint, setHint] = useState<string | undefined>();
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | undefined>();

  function quit(): void {
    console.log("exit");
    exit();
    // 兜底：若 Ink 卸载后仍有句柄残留，确保进程退出
    setTimeout(() => process.exit(0), 100);
  }

  function backToMenu(): void {
    setScreen("menu");
    setCommand("");
    setBugText("");
    setHint(undefined);
    setResult("");
    setError(undefined);
  }

  function startInput(nextKind: AnalysisKind): void {
    setKind(nextKind);
    setCommand("");
    setHint(undefined);
    setScreen("input");
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
      kind,
      bugText,
      onDelta: (delta) => {
        full += delta;
        setResult(full);
      },
      signal: controller.signal,
    })
      .then((text) => {
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
  }, [screen, config, kind, bugText]);

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
                  setScreen("menu");
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

      {screen === "menu" && (
        <Box flexDirection="column">
          <Menu />
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">请选择：1. simple-analytic　2. deep-analytic　3. exit</Text>
            <TextInput
              value={command}
              onChange={setCommand}
              onSubmit={(value) => {
                const cmd = parseCommand(value, "menu");
                if (cmd.type === "simple") {
                  startInput("simple");
                } else if (cmd.type === "deep") {
                  startInput("deep");
                } else if (cmd.type === "exit") {
                  quit();
                } else {
                  setHint("无效选择，请输入 1 / 2 / 3 或 exit。");
                  setCommand("");
                }
              }}
              placeholder="1 / 2 / 3 / exit"
            />
            {hint !== undefined && <Text color="red">{hint}</Text>}
          </Box>
        </Box>
      )}

      {screen === "input" && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">
            {kind === "simple" ? "【1. simple-analytic】快速分析" : "【2. deep-analytic】深度分析"}
          </Text>
          <Text color="gray">
            请输入 Bug 描述（可用 @&lt;文件路径&gt; 读取），回车开始分析；输入 exit 退出，menu 返回菜单。
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
              setBugText(input.value);
              setHint(undefined);
              setCommand("");
              setScreen("analyzing");
            }}
            placeholder="Bug 描述...（或 @examples/bug-login.txt）"
          />
          {hint !== undefined && <Text color="red">{hint}</Text>}
        </Box>
      )}

      {screen === "analyzing" && (
        <Box marginTop={1} flexDirection="column">
          <Spinner text={kind === "simple" ? "DeepSeek 快速分析中..." : "DeepSeek 深度分析中..."} />
          <Text color="gray">分析进行中，按 Ctrl+C 退出。</Text>
        </Box>
      )}

      {screen === "result" && (
        <Box marginTop={1} flexDirection="column">
          {error !== undefined ? <Text color="red">[错误] {error}</Text> : <Text>{result}</Text>}
          <Box marginTop={1}>
            <Text color="yellow">回车返回菜单，输入 exit 退出</Text>
          </Box>
          <TextInput
            value={command}
            onChange={setCommand}
            onSubmit={(value) => {
              if (value.trim().toLowerCase() === "exit") {
                quit();
                return;
              }
              backToMenu();
            }}
            placeholder="回车 / exit"
          />
        </Box>
      )}
    </Box>
  );
}