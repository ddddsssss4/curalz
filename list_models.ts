import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({});

async function listModels() {
    try {
        const response = await ai.models.list();
        console.log('Available models:');
        for (const model of response.models) {
            if (model.name.includes('embedding')) {
                console.log(model.name);
            }
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
