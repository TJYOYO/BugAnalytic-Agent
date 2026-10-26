#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./app.js";
import { getConfig } from "./config.js";
import { runLineMode } from "./line-mode.js";

async function main(): Promise<void> {
  const config = getConfig();

  if (!Object.values(config.providers).some((providerConfig) => providerConfig.apiKey)) {
    console.error(
      "[警告] 未检测到可用的 LLM API Key。请在 .env 中配置 DEEPSEEK_API_KEY、OPENAI_API_KEY 或 COPILOT_API_KEY 后重试。",
    );
  }

  if (process.stdin.isTTY) {
    render(<App config={config} />, { exitOnCtrlC: false });
  } else {
    await runLineMode(config);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});