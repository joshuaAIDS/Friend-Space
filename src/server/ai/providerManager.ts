// src/server/ai/providerManager.ts
import { callGrok } from "./grokProvider.js";
import { callGemini } from "./geminiProvider.js";

export const generateAIResponse = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  try {
    console.log("Attempting to call Grok API...");
    return await callGrok(systemPrompt, userPrompt);
  } catch (error: any) {
    console.error("Grok failed, falling back to Gemini:", error.message);
    try {
      console.log("Attempting to call Gemini API...");
      return await callGemini(systemPrompt, userPrompt);
    } catch (geminiError: any) {
      console.error("Gemini failed as well:", geminiError.message);
      return "I’m having trouble responding right now. Please try again in a moment.";
    }
  }
};
