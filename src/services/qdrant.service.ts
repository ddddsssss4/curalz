import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL || '',
    apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION_NAME = 'patient_memories';
const VECTOR_SIZE = 3072; // gemini-embedding-001 dimension

/**
 * Initialize Qdrant collection and payload index
 */
export const initializeQdrant = async () => {
    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(
            (c) => c.name === COLLECTION_NAME
        );

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

        // 🔥 Ensure payload index for filtering by userId
        try {
            await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
                field_name: 'userId',
                field_schema: 'keyword'
            });

            console.log('Payload index for userId ensured');
        } catch (indexError: any) {
            // Ignore error if index already exists
            console.log('Payload index already exists or cannot be created again');
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
        if (vector.length !== VECTOR_SIZE) {
            throw new Error(
                `Vector dimension mismatch. Expected ${VECTOR_SIZE}, got ${vector.length}`
            );
        }

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
        console.error('Error storing vector:', JSON.stringify(error, null, 2));
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
): Promise<
    Array<{
        id: string;
        score: number;
        payload: any;
    }>
> => {
    try {
        if (queryVector.length !== VECTOR_SIZE) {
            throw new Error(
                `Query vector dimension mismatch. Expected ${VECTOR_SIZE}, got ${queryVector.length}`
            );
        }

        // 🔥 Prevent searching empty collection
        const countResult = await qdrantClient.count(COLLECTION_NAME, {
            exact: true
        });

        if (countResult.count === 0) {
            return [];
        }

        const searchResult = await qdrantClient.search(COLLECTION_NAME, {
            vector: queryVector,
            limit,
            filter: {
                must: [
                    {
                        key: 'userId',
                        match: { value: userId }
                    }
                ]
            },
            with_payload: true
        });

        return searchResult.map((result) => ({
            id: result.id as string,
            score: result.score,
            payload: result.payload
        }));

    } catch (error: any) {
        console.error('Error searching vectors:', JSON.stringify(error, null, 2));
        throw error;
    }
};

/**
 * Delete a vector by ID
 */
export const deleteVector = async (id: string): Promise<void> => {
    try {
        await qdrantClient.delete(COLLECTION_NAME, {
            wait: true,
            points: [id]
        });
    } catch (error: any) {
        console.error('Error deleting vector:', JSON.stringify(error, null, 2));
        throw error;
    }
};

export { qdrantClient };