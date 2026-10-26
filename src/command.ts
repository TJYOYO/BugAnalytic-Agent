export type Command =
  | { type: "start" }
  | { type: "deepseek" }
  | { type: "chatgpt" }
  | { type: "copilot" }
  | { type: "simple" }
  | { type: "deep" }
  | { type: "back" }
  | { type: "exit" }
  | { type: "invalid" };

export type CommandScreen = "idle" | "provider" | "analysis";

export function normalizeCommand(input: string): string {
  return input.trim().toLowerCase();
}

export function parseCommand(raw: string, screen: CommandScreen): Command {
  const input = normalizeCommand(raw);

  if (input === "exit" || input === "quit" || input === "q") {
    return { type: "exit" };
  }

  if (screen === "idle" && input === "analytic") {
    return { type: "start" };
  }

  if (screen === "provider") {
    if (input === "1" || input === "deepseek") return { type: "deepseek" };
    if (input === "2" || input === "chatgpt" || input === "openai") return { type: "chatgpt" };
    if (input === "3" || input === "copilot" || input === "github-copilot") return { type: "copilot" };
    if (input === "4") return { type: "exit" };
  }

  if (screen === "analysis") {
    if (input === "1" || input === "simple" || input === "simple-analytic") {
      return { type: "simple" };
    }
    if (input === "2" || input === "deep" || input === "deep-analytic") {
      return { type: "deep" };
    }
    if (input === "3" || input === "back") return { type: "back" };
    if (input === "4") return { type: "exit" };
  }

  return { type: "invalid" };
}