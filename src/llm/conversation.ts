import type { ChatMessage } from "./langchain.js";

const DEFAULT_MAX_EXCHANGES = 8;

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export class ConversationMemory {
  private messages: ConversationMessage[] = [];

  constructor(private readonly maxExchanges = DEFAULT_MAX_EXCHANGES) {}

  get hasHistory(): boolean {
    return this.messages.length > 0;
  }

  addExchange(userText: string, assistantText: string): void {
    const user = userText.trim();
    const assistant = assistantText.trim();
    if (!user || !assistant) {
      return;
    }

    this.messages.push(
      { role: "user", content: user },
      { role: "assistant", content: assistant },
    );

    const maxMessages = this.maxExchanges * 2;
    if (this.messages.length > maxMessages) {
      this.messages = this.messages.slice(-maxMessages);
    }
  }

  getMessages(): ChatMessage[] {
    return this.messages.map((message) => ({ ...message }));
  }

  clear(): void {
    this.messages = [];
  }
}
