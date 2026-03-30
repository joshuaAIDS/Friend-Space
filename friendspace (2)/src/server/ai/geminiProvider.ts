// src/server/ai/geminiProvider.ts
import { GoogleGenAI } from "@google/genai";

export const callGemini = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      config: {
        maxOutputTokens: 500,
        temperature: 0.7
      }
    });

    return response.text || "I'm not sure how to respond to that.";
  } catch (error: any) {
    console.error("Gemini API Error:", error.message);
    throw error;
  }
};
