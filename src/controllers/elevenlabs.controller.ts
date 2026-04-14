import { Request, Response } from "express";
import axios from "axios";

const ELEVENLABS_API_KEY_1 = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = "agent_6801kp65pr7de35r97jbnfk2zh6c";

export const getSignedUrl = async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url",
      {
        params: {
          agent_id: AGENT_ID,
        },
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY_1,
        },
      }
    );

    
    // DUMP THE RAW DATA SO WE CAN SEE IT!
    console.log("Raw ElevenLabs API Response:", response.data);

    // Return the ENTIRE object to the frontend so it doesn't get stripped to {}
    return res.json(response.data);
    
  } catch (error: any) {
    console.error("ElevenLabs Error:", error?.response?.data || error.message);
    return res.status(500).json({ error: "Failed to generate conversation token" });
  }
};
