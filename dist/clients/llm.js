import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { config } from "../config/index.js";
export function getChatModel() {
    if (!config.openAiApiKey) {
        throw new Error("Missing OPENAI_API_KEY. Set it in your environment to enable the LLM.");
    }
    return new ChatOpenAI({
        apiKey: config.openAiApiKey,
        model: config.openAiModel,
        temperature: 0.2
    });
}
export async function callChatModel(systemPrompt, userPrompt) {
    const model = getChatModel();
    const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
    ]);
    return coerceMessageContent(response.content);
}
export function coerceMessageContent(content) {
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
                return String(part.text || "");
            }
            return "";
        })
            .join("")
            .trim();
    }
    return String(content || "");
}
