import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

export function TextInput({ value, onChange, onSubmit, placeholder }: TextInputProps) {
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    setCursor((current) => Math.min(current, Array.from(value).length));
  }, [value]);

  useInput((input, key) => {
    const chars = Array.from(value);

    if (key.return) {
      onSubmit?.(value);
      return;
    }

    if (key.backspace || key.delete) {
      if (cursor > 0) {
        const next = [...chars.slice(0, cursor - 1), ...chars.slice(cursor)].join("");
        onChange(next);
        setCursor(cursor - 1);
      }
      return;
    }

    if (key.leftArrow) {
      setCursor((current) => Math.max(0, current - 1));
      return;
    }

    if (key.rightArrow) {
      setCursor((current) => Math.min(chars.length, current + 1));
      return;
    }

    if (input && input.charCodeAt(0) >= 32 && !key.ctrl) {
      const next = [...chars.slice(0, cursor), input, ...chars.slice(cursor)].join("");
      onChange(next);
      setCursor(cursor + Array.from(input).length);
    }
  });

  const display = value.length > 0 ? value : (placeholder ?? "");
  const chars = Array.from(display);
  const before = chars.slice(0, cursor).join("");
  const atCursor = chars[cursor] ?? " ";
  const after = chars.slice(cursor + 1).join("");

  return (
    <Box>
      <Text dimColor={value.length === 0}>
        {before}
        <Text inverse>{atCursor}</Text>
        {after}
      </Text>
    </Box>
  );
}