import { Request, Response } from "express";
import { getSignedUploadUrl, inferMediaType } from "../services/upload.service";

interface AuthRequest extends Request {
  user?: any;
}

/**
 * Generate a signed URL for media upload
 */
export const getUploadUrl = async (req: AuthRequest, res: Response) => {
  const { fileName, mimeType } = req.body;

  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authorized" });
    }

    if (!fileName || !mimeType) {
      return res.status(400).json({ error: "fileName and mimeType are required" });
    }

    const userId = req.user._id.toString();
    const result = await getSignedUploadUrl(userId, fileName, mimeType);
    const mediaType = inferMediaType(mimeType);

    res.json({
      signedUrl: result.signedUrl,
      publicUrl: result.publicUrl,
      mediaType,
      path: result.path
    });
  } catch (error: any) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: error.message || "Failed to generate upload URL" });
  }
};
