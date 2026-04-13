import { Request, Response } from "express";
import Memory from "../models/Memory";

interface AuthRequest extends Request {
  user?: any;
}

export const getMemoriesByType = async (req: AuthRequest, res: Response) => {
  const userId = req.user._id;
  const { type } = req.params;
  const { limit = 20, skip = 0 } = req.query;

  try {
    const validTypes = ["photo", "place", "story", "chat"];
    
    const typeParam = typeof type === 'string' ? type : String(type);
    if (!validTypes.includes(typeParam)) {
      return res.status(400).json({ error: `Invalid memory type. Must be one of: ${validTypes.join(", ")}` });
    }

    const memories = await Memory.find({ userId, type: typeParam })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    res.json({
      memories,
      count: memories.length,
    });
  } catch (error: any) {
    console.error("Error fetching memories by type:", error);
    res.status(500).json({ error: error.message });
  }
};
