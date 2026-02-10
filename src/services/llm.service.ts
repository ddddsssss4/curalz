import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Generate a chat response with context from retrieved memories
 */
export const generateChatResponse = async (
    userMessage: string,
    relevantMemories: Array<{ rawText: string; timestamp: Date }> = []
): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        // Build context from memories
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

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `User: ${userMessage}\nAssistant:` }
        ]);

        return result.response.text();
    } catch (error: any) {
        console.error('Error generating chat response:', error.message);
        throw new Error(`Failed to generate response: ${error.message}`);
    }
};
