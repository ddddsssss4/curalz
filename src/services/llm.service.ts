import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const buildPrompt = (
  userMessage: string,
  relevantMemories: Array<{ rawText: string; timestamp: Date; imageUrl?: string; mediaType?: string }>,
) => {
  let context = "";
  if (relevantMemories.length > 0) {
    context =
      "\n\nRelevant memories:\n" +
      relevantMemories
        .map(
          (m, i) =>
            `${i + 1}. ${m.rawText} (${new Date(m.timestamp).toLocaleDateString()})${m.imageUrl ? ` [IMAGE: ${m.imageUrl}]` : ''}`,
        )
        .join("\n");
  }

  const systemPrompt = `You are a caring AI assistant helping a patient with Alzheimer's disease.
Your role is to:
- Help them remember important people, events, and moments
- Speak kindly and patiently
- Never mention that they have memory issues
- Be conversational and warm
- Be concise in your answer
- If a relevant memory has an [IMAGE: url] tag attached, you can optionally show the image to the user in your response by using markdown format: ![Description of image](url)
${context}`;

  return systemPrompt + "\n\nUser: " + userMessage;
};

export const generateChatResponse = async (
  userMessage: string,
  relevantMemories: Array<{ rawText: string; timestamp: Date; imageUrl?: string; mediaType?: string }> = [],
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: buildPrompt(userMessage, relevantMemories) }],
        },
      ],
    });
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("Error generating chat response:", error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
};

export async function* streamChatResponse(
  userMessage: string,
  relevantMemories: Array<{ rawText: string; timestamp: Date; imageUrl?: string; mediaType?: string }> = [],
): AsyncGenerator<string> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [{ text: buildPrompt(userMessage, relevantMemories) }],
      },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}
