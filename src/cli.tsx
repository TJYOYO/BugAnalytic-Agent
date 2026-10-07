#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./app.js";
import { getConfig } from "./config.js";
import { runLineMode } from "./line-mode.js";

async function main(): Promise<void> {
  const config = getConfig();

  if (!config.apiKey) {
    console.error(
      "[警告] 未检测到 DEEPSEEK_API_KEY，分析功能将不可用。请参考 .env.example 配置后重试。",
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