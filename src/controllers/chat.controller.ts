import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Thought from '../models/Thought';
import { generateEmbedding } from '../services/embedding.service';
import { storeVector, searchSimilarMemories } from '../services/qdrant.service';
import { generateChatResponse } from '../services/llm.service';
import { extractEntities } from '../services/entityExtraction.service';

interface AuthRequest extends Request {
    user?: any;
}

/**
 * Store a patient's message and generate AI response
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // 1. Generate embedding for the message
        const embedding = await generateEmbedding(message);

        // 2. Search for similar memories
        const similarMemories = await searchSimilarMemories(embedding, userId.toString(), 5);

        // 3. Extract entities
        const entities = await extractEntities(message);

        // 4. Store thought in MongoDB
        const qdrantId = uuidv4();
        const thought = await Thought.create({
            userId,
            rawText: message,
            entities,
            qdrantId,
            timestamp: new Date()
        });

        // 5. Store vector in Qdrant
        await storeVector(qdrantId, embedding, {
            userId: userId.toString(),
            rawText: message,
            timestamp: new Date(),
            entities
        });

        // 6. Generate AI response with context
        const relevantMemories = similarMemories.map(m => ({
            rawText: m.payload.rawText,
            timestamp: m.payload.timestamp
        }));

        const aiResponse = await generateChatResponse(message, relevantMemories);

        res.json({
            thought: {
                id: thought._id,
                rawText: thought.rawText,
                entities: thought.entities,
                timestamp: thought.timestamp
            },
            response: aiResponse,
            relevantMemories: relevantMemories.length
        });
    } catch (error: any) {
        console.error('Error in sendMessage:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get chat history for a patient
 */
export const getChatHistory = async (req: AuthRequest, res: Response) => {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    try {
        const thoughts = await Thought.find({ userId })
            .sort({ timestamp: -1 })
            .limit(Number(limit))
            .skip(Number(skip));

        res.json({
            thoughts,
            count: thoughts.length
        });
    } catch (error: any) {
        console.error('Error getting chat history:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Search memories by semantic query
 */
export const searchMemories = async (req: AuthRequest, res: Response) => {
    const { query } = req.body;
    const userId = req.user._id;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        // Generate embedding for query
        const embedding = await generateEmbedding(query);

        // Search Qdrant
        const results = await searchSimilarMemories(embedding, userId.toString(), 10);

        // Fetch full thought details from MongoDB
        const qdrantIds = results.map(r => r.id);
        const thoughts = await Thought.find({ qdrantId: { $in: qdrantIds } });

        res.json({
            results: thoughts.map((t, i) => ({
                thought: t,
                score: results.find(r => r.id === t.qdrantId)?.score || 0
            }))
        });
    } catch (error: any) {
        console.error('Error searching memories:', error);
        res.status(500).json({ error: error.message });
    }
};
