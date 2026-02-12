import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333'
});

const COLLECTION_NAME = 'patient_memories';
const VECTOR_SIZE = 3072; // Gemini gemini-embedding-001 dimension


export const initializeQdrant = async () => {
    try {
        // Check if collection exists
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

        if (!exists) {
            await qdrantClient.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: VECTOR_SIZE,
                    distance: 'Cosine'
                }
            });
            console.log(`Qdrant collection "${COLLECTION_NAME}" created`);
        } else {
            console.log(`Qdrant collection "${COLLECTION_NAME}" already exists`);
        }
    } catch (error: any) {
        console.error('Error initializing Qdrant:', error.message);
        throw error;
    }
};

/**
 * Store a vector in Qdrant
 */
export const storeVector = async (
    id: string,
    vector: number[],
    payload: {
        userId: string;
        rawText: string;
        timestamp: Date;
        entities?: {
            people?: string[];
            activities?: string[];
        };
    }
): Promise<void> => {
    try {
        await qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points: [
                {
                    id,
                    vector,
                    payload
                }
            ]
        });
    } catch (error: any) {
        console.error('Error storing vector:', error.message);
        throw error;
    }
};

/**
 * Search for similar vectors
 */
export const searchSimilarMemories = async (
    queryVector: number[],
    userId: string,
    limit: number = 5
): Promise<Array<{
    id: string;
    score: number;
    payload: any;
}>> => {
    try {
        const searchResult = await qdrantClient.search(COLLECTION_NAME, {
            vector: queryVector,
            filter: {
                must: [
                    {
                        key: 'userId',
                        match: { value: userId }
                    }
                ]
            },
            limit,
            with_payload: true
        });

        return searchResult.map(result => ({
            id: result.id as string,
            score: result.score,
            payload: result.payload
        }));
    } catch (error: any) {
        console.error('Error searching vectors:', error.message);
        throw error;
    }
};


export const deleteVector = async (id: string): Promise<void> => {
    try {
        await qdrantClient.delete(COLLECTION_NAME, {
            wait: true,
            points: [id]
        });
    } catch (error: any) {
        console.error('Error deleting vector:', error.message);
        throw error;
    }
};

export { qdrantClient };
