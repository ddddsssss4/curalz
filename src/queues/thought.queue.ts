import { Queue } from "bullmq";
import { redisConnection } from "./redis.connection";

export interface ThoughtJobData {
  qdrantId: string;
  userId: string;
  rawText: string;
  embedding: number[];
  timestamp: Date;
}

export const THOUGHT_QUEUE_NAME = "thought-processing";

export const thoughtQueue = new Queue<ThoughtJobData>(THOUGHT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100, // keep last 100 completed jobs
    removeOnFail: 200,     // keep last 200 failed jobs for inspection
  },
});
