import api from "./api";

const API_BASE_URL = "http://localhost:5000/api";

export const authService = {
  register: async (data: {
    name: string;
    email: string;
    password: string;
    role: "patient" | "caregiver";
  }) => {
    const response = await api.post("/auth/register", data);
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },
};

export const chatService = {
  sendMessage: async (message: string) => {
    const response = await api.post("/chat/message", { message });
    return response.data;
  },

  sendMessageStream: async (
    message: string,
    onChunk: (text: string) => void,
    onMeta: (data: { thought: unknown; relevantMemories: number }) => void,
  ): Promise<void> => {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/chat/message/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const parts = buffer.split("\n\n");

      // The last part may be an incomplete event — keep it in the buffer
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "meta") {
            onMeta(event);
          } else if (event.type === "chunk") {
            onChunk(event.text);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
          // "done" type — nothing to do, the while loop will end naturally
        } catch {
          // skip malformed events
        }
      }
    }
  },

  getHistory: async (limit = 20) => {
    const response = await api.get(`/chat/history?limit=${limit}`);
    return response.data;
  },

  search: async (query: string) => {
    const response = await api.post("/chat/search", { query });
    return response.data;
  },
};

export const eventService = {
  getAll: async () => {
    const response = await api.get("/events");
    return response.data;
  },

  create: async (data: unknown) => {
    const response = await api.post("/events", data);
    return response.data;
  },

  update: async (id: string, data: unknown) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },
};

export const caregiverService = {
  linkPatient: async (email: string) => {
    const response = await api.post("/caregiver/patient/link", { email });
    return response.data;
  },
  addMemory: async (
    patientId: string, 
    message: string, 
    mediaData?: { imageUrl: string, mediaType: string, mimeType: string }
  ) => {
    const payload = mediaData ? { message, ...mediaData } : { message };
    const response = await api.post(`/caregiver/patient/${patientId}/memory`, payload);
    return response.data;
  },
  createEvent: async (patientId: string, eventData: unknown) => {
    const response = await api.post(
      `/caregiver/patient/${patientId}/event`,
      eventData,
    );
    return response.data;
  },
  getEvents: async (patientId: string) => {
    const response = await api.get(`/caregiver/patient/${patientId}/events`);
    return response.data;
  },
  updateEvent: async (eventId: string, eventData: unknown) => {
    const response = await api.put(`/caregiver/event/${eventId}`, eventData);
    return response.data;
  },
  deleteEvent: async (eventId: string) => {
    const response = await api.delete(`/caregiver/event/${eventId}`);
    return response.data;
  },
  getPatients: async () => {
    const response = await api.get("/caregiver/patients");
    return response.data;
  },
  getPatientActivity: async (patientId: string, limit = 10) => {
    const response = await api.get(
      `/caregiver/patient/${patientId}/activity?limit=${limit}`,
    );
    return response.data;
  },
};

export const mediaService = {
  getUploadUrl: async (fileName: string, mimeType: string) => {
    const response = await api.post("/media/upload-url", { fileName, mimeType });
    return response.data;
  },
  uploadToSupabase: async (signedUrl: string, file: File) => {
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to upload file to storage");
    }
    return response;
  }
};
