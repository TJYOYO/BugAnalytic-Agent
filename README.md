# BugAnalytic-Agent

基于 **DeepSeek** 的 Bug 分析 Agent。使用 **Node.js + React (Ink) + TypeScript** 实现的交互式 CLI：

- 输入 `Analytic` 进入分析菜单
- 菜单：`1. simple-analytic`（快速分析）/ `2. deep-analytic`（深度分析）/ `3. exit`（退出）
- 输入 `exit` 输出 `exit` 并退出

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 DeepSeek API Key

API Key 从环境变量 `DEEPSEEK_API_KEY` 读取（也可复制 `.env.example` 为 `.env` 填写）：

```bash
# Windows PowerShell
$env:DEEPSEEK_API_KEY = "sk-xxxx"

# Linux / macOS
export DEEPSEEK_API_KEY="sk-xxxx"
```

支持的环境变量：

| 变量 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- |
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API Key | - |
| `DEEPSEEK_BASE_URL` | 否 | API 地址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 模型名称 | `deepseek-chat` |

### 3. 运行

```bash
# 开发模式（tsx 直接运行）
npm run dev

# 或先构建再运行
npm run build
npm start
```

### 使用示例

1. 启动后输入 `Analytic` 回车，进入图形菜单
2. 输入 `1` 选择 simple-analytic（快速分析），或 `2` 选择 deep-analytic（深度分析）
3. 粘贴 Bug 描述，或输入 `@examples/bug-login.txt` 读取示例文件
4. 等待 DeepSeek 返回流式分析结果
5. 输入 `3` 或 `exit`，CLI 输出 `exit` 并退出

> 非交互（stdin 非 TTY，如管道）时自动切换为行输入模式，方便 CI / 脚本调用：
>
> ```bash
> printf "Analytic\n3\n" | node dist/cli.js
> ```

## 测试

```bash
npm test
```

## 项目结构

```
src/
├── cli.tsx               # CLI 入口（TTY 渲染 React UI，否则行模式）
├── app.tsx               # Ink React 主界面与状态机
├── config.ts             # 读取环境变量（DEEPSEEK_API_KEY 等）
├── command.ts            # 命令解析（Analytic / 1 / 2 / 3 / exit）
├── bug-input.ts          # Bug 输入（直接文本 或 @文件路径）
├── texts.ts              # Banner / 菜单图形文本
├── components/           # Banner、Menu、Spinner、TextInput 组件
├── llm/
│   ├── deepseek.ts       # DeepSeek Chat Completions 客户端（SSE 流式）
│   ├── prompts.ts        # 快速 / 深度分析 Prompt
│   └── analyze.ts        # 分析编排
└── *.test.ts             # 单元测试
```

## 技术栈

- Node.js 18+（内置 fetch）
- React 18 + Ink 5（终端 React 渲染）
- TypeScript 5
- DeepSeek API（`deepseek-chat`，流式输出）