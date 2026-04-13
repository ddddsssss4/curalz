import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { thoughtQueue } from "./queues/thought.queue";

import authRoutes from "./routes/auth.routes";
import eventRoutes from "./routes/event.routes";
import conversationRoutes from "./routes/conversation.routes";
import chatRoutes from "./routes/chat.routes";
import caregiverRoutes from "./routes/caregiver.routes";
import mediaRoutes from "./routes/media.routes";
import patientRoutes from "./routes/patient.routes";

const app = express();

// Middleware
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false, // Bull Board UI needs inline scripts
  }),
);
app.use(express.json());

// Bull Board dashboard
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/queues");

createBullBoard({
  queues: [new BullMQAdapter(thoughtQueue)],
  serverAdapter,
});

app.use("/queues", serverAdapter.getRouter());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/conversation", conversationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/caregiver", caregiverRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/patient", patientRoutes);

// Swagger Documentation
const swaggerDocument = YAML.load(path.join(__dirname, "../docs/swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
  res.send("Medical Memory Assistant API is running");
});

export default app;
