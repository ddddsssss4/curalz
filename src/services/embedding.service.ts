import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Generate text embedding using Gemini's embedding model
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'embedding-001' });

        const result = await model.embedContent(text);
        const embedding = result.embedding;

        return embedding.values;
    } catch (error: any) {
        console.error('Error generating embedding:', error.message);
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
