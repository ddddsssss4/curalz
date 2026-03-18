import http from "http";
import app from "./app";
import connectDB from "./config/db";
import { setupQdrant } from "./config/qdrant";
import dotenv from "dotenv";
import "./jobs/reminder.job";
import "./queues/thought.worker";

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB();
setupQdrant();

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bull Board dashboard → http://localhost:${PORT}/queues`);
});
