import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});


export const generateChatResponse = async (
    userMessage: string,
    relevantMemories: Array<{ rawText: string; timestamp: Date }> = []
): Promise<string> => {
    try {
       
        let context = '';
        if (relevantMemories.length > 0) {
            context = '\n\nRelevant memories:\n' + relevantMemories
                .map((m, i) => `${i + 1}. ${m.rawText} (${new Date(m.timestamp).toLocaleDateString()})`)
                .join('\n');
        }

        const systemPrompt = `You are a caring AI assistant helping a patient with Alzheimer's disease. 
Your role is to:
- Help them remember important people, events, and moments
- Speak kindly and patiently
- Never mention that they have memory issues
- Be conversational and warm
${context}`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                { role: "user", parts: [{ text: systemPrompt + "\n\nUser: " + userMessage }] }
            ]
        });

        return response.text || "I'm sorry, I couldn't generate a response.";
    } catch (error: any) {
        console.error('Error generating chat response:', error);
        throw new Error(`Failed to generate response: ${error.message}`);
    }
};
