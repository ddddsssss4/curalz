import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Thought from "../models/Thought";
import { generateEmbedding } from "../services/embedding.service";
import { searchSimilarMemories } from "../services/qdrant.service";
import {
  generateChatResponse,
  streamChatResponse,
} from "../services/llm.service";
import { thoughtQueue } from "../queues/thought.queue";
import { Timer } from "../utils/timer";

interface AuthRequest extends Request {
  user?: any;
}

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  const userId = req.user._id;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const timer = new Timer("sendMessage");

  try {
    const embedding = await timer.measure("embedding:generate", () =>
      generateEmbedding(message),
    );

    const similarMemories = await timer.measure("qdrant:search", () =>
      searchSimilarMemories(embedding, userId.toString(), 5),
    );

    const relevantMemories = similarMemories.map((m) => ({
      rawText: m.payload.rawText,
      timestamp: m.payload.timestamp,
    }));

    const aiResponse = await timer.measure("gemini:chatResponse", () =>
      generateChatResponse(message, relevantMemories),
    );

    timer.end();

    const qdrantId = uuidv4();
    const timestamp = new Date();

    await thoughtQueue.add("process-thought", {
      qdrantId,
      userId: userId.toString(),
      rawText: message,
      embedding,
      timestamp,
    });

    res.json({
      thought: {
        qdrantId,
        rawText: message,
        entities: { people: [], activities: [] },
        timestamp,
      },
      response: aiResponse,
      relevantMemories: relevantMemories.length,
      imageUrls: similarMemories.map((m) => m.payload.imageUrl).filter(Boolean),
    });
  } catch (error: any) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ error: error.message });
  }
};

export const sendMessageStream = async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  const userId = req.user._id;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const timer = new Timer("sendMessageStream");

  try {
    // 1. Generate embedding
    const embedding = await timer.measure("embedding:generate", () =>
      generateEmbedding(message),
    );

    // 2. Search similar memories
    const similarMemories = await timer.measure("qdrant:search", () =>
      searchSimilarMemories(embedding, userId.toString(), 5),
    );

    const qdrantId = uuidv4();
    const timestamp = new Date();

    // Send thought metadata immediately so the client can render it right away
    sendEvent({
      type: "meta",
      thought: {
        qdrantId,
        rawText: message,
        entities: { people: [], activities: [] },
        timestamp,
      },
      relevantMemories: similarMemories.length,
      imageUrls: similarMemories.map((m) => m.payload.imageUrl).filter(Boolean),
    });

    const relevantMemories = similarMemories.map((m) => ({
      rawText: m.payload.rawText,
      timestamp: m.payload.timestamp,
    }));

    // 3. Stream Gemini response chunk by chunk
    let firstChunk = true;
    const streamStart = performance.now();

    for await (const chunk of streamChatResponse(message, relevantMemories)) {
      if (firstChunk) {
        console.log(
          `  ✔ [sendMessageStream] gemini:firstChunk → ${(performance.now() - streamStart).toFixed(2)}ms`,
        );
        firstChunk = false;
      }
      sendEvent({ type: "chunk", text: chunk });
    }

    console.log(
      `  ✔ [sendMessageStream] gemini:streamComplete → ${(performance.now() - streamStart).toFixed(2)}ms`,
    );

    // 4. Enqueue background job after response is fully streamed
    await thoughtQueue.add("process-thought", {
      qdrantId,
      userId: userId.toString(),
      rawText: message,
      embedding,
      timestamp,
    });

    sendEvent({ type: "done" });
    timer.end();
    res.end();
  } catch (error: any) {
    console.error("Error in sendMessageStream:", error);
    sendEvent({ type: "error", message: error.message });
    res.end();
  }
};

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
      count: thoughts.length,
    });
  } catch (error: any) {
    console.error("Error getting chat history:", error);
    res.status(500).json({ error: error.message });
  }
};

export const searchMemories = async (req: AuthRequest, res: Response) => {
  const { query } = req.body;
  const userId = req.user._id;

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  const timer = new Timer("searchMemories");

  try {
    const embedding = await timer.measure("embedding:generate", () =>
      generateEmbedding(query),
    );

    const results = await timer.measure("qdrant:search", () =>
      searchSimilarMemories(embedding, userId.toString(), 10),
    );

    const qdrantIds = results.map((r) => r.id);
    const thoughts = await timer.measure("mongodb:fetchThoughts", () =>
      Thought.find({ qdrantId: { $in: qdrantIds } }),
    );

    const searchResults = thoughts.map((t) => ({
      thought: t,
      score: results.find((r) => r.id === t.qdrantId)?.score || 0,
    }));

    const relevantMemories = searchResults
      .filter((r) => r.score > 0.4)
      .map((r) => ({
        rawText: r.thought.rawText,
        timestamp: r.thought.timestamp,
      }));

    let summary = "";
    if (relevantMemories.length > 0) {
      summary = await timer.measure("gemini:summarize", () =>
        generateChatResponse(
          `The patient is searching their memories for: "${query}". Summarize what you found in their memories about this topic. Be warm and helpful.`,
          relevantMemories,
        ),
      );
    } else {
      summary = `I couldn't find any memories related to "${query}". Try a different search term!`;
    }

    timer.end();

    res.json({
      summary,
      results: searchResults,
    });
  } catch (error: any) {
    console.error("Error searching memories:", error);
    res.status(500).json({ error: error.message });
  }
};
