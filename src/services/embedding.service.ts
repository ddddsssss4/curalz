import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generate text embedding using Gemini's embedding model
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    try {
        const response = await ai.models.embedContent({
            model: "text-embedding-004",
            contents: [
                {
                    parts: [
                        { text: text }
                    ]
                }
            ]
        });

        // Handle response structure from new SDK
        const embedding = response.embedding?.values;

        if (!embedding) {
            throw new Error("No embedding returned from API");
        }

        return embedding;
    } catch (error: any) {
        console.error('Error generating embedding:', error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
};

/**
 * Generate embeddings for multiple texts in batch
 */
export const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
    const embeddings = await Promise.all(texts.map(text => generateEmbedding(text)));
    return embeddings;
};
