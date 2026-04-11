import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({apiKey: process.env.GOOGLE_API_KEY});

export const captionImage = async (
  publicUrl: string,
  mimeType: string,
): Promise<string> => {
  // Fetch image bytes from Supabase public URL
  const res = await fetch(publicUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from storage: ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: `You are helping an Alzheimer's patient preserve their memories.
Describe this image in warm, simple language as if you are capturing a memory for them.
Include:
- Who is in the image (if people are visible)
- What is happening or what activity is taking place
- Where it appears to be (setting or location)
- Any notable objects, emotions, or details

Keep it to 2-3 sentences, conversational and warm.`,
          },
        ],
      },
    ],
  });

  return response.text || "A memory captured in this image.";
};
