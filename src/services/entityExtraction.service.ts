import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ExtractedEntities {
    people: string[];
    activities: string[];
}

/**
 * Extract people and activities from text using Gemini
 */
export const extractEntities = async (text: string): Promise<ExtractedEntities> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        const prompt = `Extract people's names and activities from the following text. Return ONLY a JSON object with two arrays: "people" and "activities".

Text: "${text}"

Example response format:
{
  "people": ["Sarah", "John"],
  "activities": ["lunch", "walking"]
}

JSON response:`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const entities = JSON.parse(jsonMatch[0]);
            return {
                people: entities.people || [],
                activities: entities.activities || []
            };
        }

        // Fallback: return empty arrays
        return { people: [], activities: [] };
    } catch (error: any) {
        console.error('Error extracting entities:', error.message);
        // Fallback to regex-based extraction
        return extractEntitiesRegex(text);
    }
};

/**
 * Fallback regex-based extraction
 */
const extractEntitiesRegex = (text: string): ExtractedEntities => {
    // Simple regex to find capitalized words (potential names)
    const namePattern = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g;
    const names = text.match(namePattern) || [];

    // Common activities
    const activityKeywords = ['lunch', 'dinner', 'breakfast', 'visit', 'walk', 'talk', 'meeting'];
    const activities = activityKeywords.filter(activity =>
        text.toLowerCase().includes(activity)
    );

    return {
        people: [...new Set(names)], // Remove duplicates
        activities
    };
};
