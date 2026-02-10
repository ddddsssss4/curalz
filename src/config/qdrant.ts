import { initializeQdrant } from '../services/qdrant.service';

export const setupQdrant = async () => {
    try {
        await initializeQdrant();
        console.log('Qdrant initialized successfully');
    } catch (error: any) {
        console.error('Failed to initialize Qdrant:', error.message);
        console.error('Make sure Qdrant is running via docker-compose');
    }
};
