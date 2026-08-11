import { Queue } from "bullmq";
import { bullmqconnections } from "../../config/bullmq";

let slotGenerationQueue: Queue;

export function getSlotGenerationQueue(): Queue {
  if (!slotGenerationQueue) {
    slotGenerationQueue = new Queue("slot-generation", {
      connection: bullmqconnections,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: false,
      },
    });
  }

  return slotGenerationQueue;
}
