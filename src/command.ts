export type Command =
  | { type: "start" }
  | { type: "simple" }
  | { type: "deep" }
  | { type: "exit" }
  | { type: "invalid" };

export type CommandScreen = "idle" | "menu";

export function normalizeCommand(input: string): string {
  return input.trim().toLowerCase();
}

export function parseCommand(raw: string, screen: CommandScreen): Command {
  const input = normalizeCommand(raw);

  if (input === "exit" || input === "quit" || input === "q" || input === "3") {
    return { type: "exit" };
  }

  if (screen === "idle" && input === "analytic") {
    return { type: "start" };
  }

  if (screen === "menu") {
    if (input === "1" || input === "simple" || input === "simple-analytic") {
      return { type: "simple" };
    }
    if (input === "2" || input === "deep" || input === "deep-analytic") {
      return { type: "deep" };
    }
  }

  return { type: "invalid" };
}