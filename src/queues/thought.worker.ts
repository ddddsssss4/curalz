import { Worker, Job } from "bullmq";
import { redisConnection } from "./redis.connection";
import { THOUGHT_QUEUE_NAME, ThoughtJobData } from "./thought.queue";
import { extractEntities } from "../services/entityExtraction.service";
import { storeVector } from "../services/qdrant.service";
import Memory from "../models/Memory";

const processThought = async (job: Job<ThoughtJobData>) => {
  const { qdrantId, userId, rawText, embedding, timestamp } = job.data;

  console.log(`\n⚙  [worker] starting job ${job.id} for qdrantId=${qdrantId}`);
  const origin = performance.now();

  const elapsed = () => `${(performance.now() - origin).toFixed(2)}ms`;

  // Step 1 — Entity extraction (optional, non-blocking for user)
  let entities = { people: [] as string[], activities: [] as string[] };
  try {
    const t = performance.now();
    entities = await extractEntities(rawText);
    console.log(`  ✔ [worker] gemini:extractEntities → ${(performance.now() - t).toFixed(2)}ms`);
  } catch (err) {
    console.error("  ✘ [worker] gemini:extractEntities failed, continuing with empty entities:", err);
  }

  // Step 2 — MongoDB write
  let memoryId = "";
  {
    const t = performance.now();
    const memory = await Memory.create({
      userId,
      qdrantId,
      type: "chat",
      createdBy: "patient",
      timestamp: new Date(timestamp),
      data: {
        rawText,
        entities,
      }
    });
    memoryId = memory._id.toString();
    console.log(`  ✔ [worker] mongodb:storeThought → ${(performance.now() - t).toFixed(2)}ms`);
  }

  // Step 3 — Qdrant vector storage
  {
    const t = performance.now();
    await storeVector(qdrantId, embedding, {
      userId,
      memoryId,
      type: "chat",
      searchableText: rawText,
      rawText,
      timestamp: new Date(timestamp),
      entities,
    });
    console.log(`  ✔ [worker] qdrant:storeVector → ${(performance.now() - t).toFixed(2)}ms`);
  }

  console.log(`⚙  [worker] job ${job.id} done → total ${elapsed()}\n`);
};

export const thoughtWorker = new Worker<ThoughtJobData>(
  THOUGHT_QUEUE_NAME,
  processThought,
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

thoughtWorker.on("failed", (job, err) => {
  console.error(`  ✘ [worker] job ${job?.id} failed:`, err.message);
});
