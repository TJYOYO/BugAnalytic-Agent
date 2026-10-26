import React from "react";
import { Text } from "ink";
interface MenuProps {
  text: string;
}

export function Menu({ text }: MenuProps) {
  return <Text color="cyan">{text}</Text>;
}