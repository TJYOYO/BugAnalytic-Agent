import assert from "node:assert/strict";
import { test } from "node:test";
import { createConfig } from "./config.js";

test("createConfig 提供三个 LLM 的默认配置", () => {
  const config = createConfig({});

  assert.deepEqual(config.providers.deepseek, {
    apiKey: "",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    apiKeyEnvName: "DEEPSEEK_API_KEY",
  });
  assert.deepEqual(config.providers.chatgpt, {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyEnvName: "OPENAI_API_KEY",
  });
  assert.deepEqual(config.providers.copilot, {
    apiKey: "",
    baseUrl: "https://models.github.ai/inference",
    model: "openai/gpt-4.1",
    apiKeyEnvName: "COPILOT_API_KEY（或 GITHUB_TOKEN）",
  });
});

test("createConfig 读取本地环境变量并允许覆盖地址和模型", () => {
  const config = createConfig({
    DEEPSEEK_API_KEY: "deepseek-key",
    OPENAI_API_KEY: "openai-key",
    OPENAI_BASE_URL: "https://proxy.example/v1/",
    OPENAI_MODEL: "gpt-5",
    GITHUB_TOKEN: "github-token",
    COPILOT_MODEL: "openai/gpt-4o",
  });

  assert.equal(config.providers.deepseek.apiKey, "deepseek-key");
  assert.equal(config.providers.chatgpt.apiKey, "openai-key");
  assert.equal(config.providers.chatgpt.baseUrl, "https://proxy.example/v1/");
  assert.equal(config.providers.chatgpt.model, "gpt-5");
  assert.equal(config.providers.copilot.apiKey, "github-token");
  assert.equal(config.providers.copilot.model, "openai/gpt-4o");
});
