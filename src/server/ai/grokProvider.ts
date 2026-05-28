// src/server/ai/grokProvider.ts
import axios from "axios";

export const callGrok = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not set");
  }

  try {
    const response = await axios.post(
      "https://api.x.ai/v1/chat/completions",
      {
        model: "grok-beta", // or "grok-2-latest"
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        timeout: 10000 // 10 seconds timeout
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("Grok API Error:", error.response?.data || error.message);
    throw error;
  }
};
