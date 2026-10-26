// 导入 LangChain 的三种标准消息类型，用于将项目消息转换为模型可识别的格式。
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
// 导入 OpenAI 兼容聊天模型；各 LLM 提供方均通过 Chat Completions API 接入。
import { ChatOpenAI } from "@langchain/openai";

// 定义项目内部使用的简化聊天消息结构。
export interface ChatMessage {
  // 消息发送者：系统指令、用户输入或模型回复。
  role: "system" | "user" | "assistant";
  // 消息的纯文本内容。
  content: string;
}

// 定义调用 LangChain 模型时需要的配置与回调。
export interface LangChainOptions {
  // OpenAI 兼容 API 密钥。
  apiKey: string;
  // 可选的 OpenAI 兼容 API 基础地址。
  baseUrl?: string;
  // 可选的模型名称；未提供时保持 DeepSeek 的历史默认值。
  model?: string;
  // 可选的请求超时时间，单位为毫秒。
  timeoutMs?: number;
  // 可选的流式文本回调，每收到一个文本增量时执行。
  onDelta?: (text: string) => void;
  // 可选的取消信号，用于在用户退出时中止请求。
  signal?: AbortSignal;
}

// 调用 LangChain 模型并返回完整回复，同时将流式增量传给调用方。
export async function chatCompletion(
  // 接收模型配置、流式回调与取消信号。
  options: LangChainOptions,
  // 接收项目内部格式的历史消息。
  messages: ChatMessage[],
  // 异步完成后返回拼接好的完整文本。
): Promise<string> {
  // 创建 LangChain ChatOpenAI 实例，并配置为访问选定提供方的兼容接口。
  const model = new ChatOpenAI({
    // 传入提供方 API 密钥。
    apiKey: options.apiKey,
    // 优先使用调用方模型；否则保持 DeepSeek 的历史默认值。
    model: options.model ?? "deepseek-chat",
    // 设置生成随机性，数值越低回复越稳定。
    temperature: 0.7,
    // 设置超时；未配置时默认等待两分钟。
    timeout: options.timeoutMs ?? 120_000,
    // 传递底层 OpenAI SDK 的客户端配置。
    configuration: {
      // 使用调用方地址或 DeepSeek 默认地址，并清除末尾多余的斜杠。
      baseURL: (options.baseUrl ?? "https://api.deepseek.com").replace(/\/+$/, ""),
    },
  });

  // 累积每个流式分片，供函数结束时返回完整回答。
  let full = "";
  // 将项目消息转换为 LangChain 消息后，发起可取消的流式模型调用。
  const stream = await model.stream(toLangChainMessages(messages), { signal: options.signal });
  // 异步遍历模型持续产出的文本分片。
  for await (const chunk of stream) {
    // 仅处理纯文本内容；非文本内容（如工具调用元数据）视为空字符串。
    const delta = typeof chunk.content === "string" ? chunk.content : "";
    // 跳过空分片，避免无意义的状态更新和回调。
    if (delta) {
      // 将本次增量追加到完整结果。
      full += delta;
      // 通知调用方本次增量，以便 Ink 界面实时重新渲染。
      options.onDelta?.(delta);
    }
  }

  // 流结束后返回完整的模型回复。
  return full;
}

// 将项目内部的 ChatMessage 数组映射为 LangChain 的标准消息对象。
function toLangChainMessages(messages: ChatMessage[]) {
  // 保持原有消息顺序逐条转换。
  return messages.map((message) => {
    // 根据消息角色构造对应的 LangChain 消息类型。
    switch (message.role) {
      // 系统消息用于放置模型行为规则和输出格式要求。
      case "system":
        // 创建系统消息。
        return new SystemMessage(message.content);
      // 用户消息表示用户提供的 Bug 描述或追问。
      case "user":
        // 创建用户消息。
        return new HumanMessage(message.content);
      // 助手消息表示此前模型的回复，供后续接入记忆时使用。
      case "assistant":
        // 创建模型消息。
        return new AIMessage(message.content);
    }
  });
}
