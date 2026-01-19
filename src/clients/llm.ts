import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { config } from "../config/index.js";

export function getChatModel(): ChatGoogleGenerativeAI {
  if (!config.geminiApiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it in your environment to enable the LLM."
    );
  }

  return new ChatGoogleGenerativeAI({
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
    temperature: 0.2
  });
}

export async function callChatModel(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const model = getChatModel();
  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt)
  ] as BaseMessage[]);

  return coerceMessageContent(response.content);
}

export function coerceMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text || "");
        }
        return "";
      })
      .join("")
      .trim();
  }

  return String(content || "");
}
