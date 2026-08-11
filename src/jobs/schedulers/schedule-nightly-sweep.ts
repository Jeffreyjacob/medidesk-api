import { logger } from "../../config/logger";
import { getSlotGenerationQueue } from "../queues/slot-generation";

export async function scheduleNightlySlotSweep(): Promise<void> {
  const queue = getSlotGenerationQueue();
  const existingJobs = await queue.getRepeatableJobs();
  const alreadyScheduled = existingJobs.some(
    (job) => job.name === "nightly-sweep",
  );

  if (alreadyScheduled) {
    logger.info(
      "Nightly slot sweep already scheduled — skipping duplicate registration",
    );
    return;
  }

  await queue.add("nightly-sweep", {}, { repeat: { pattern: "0 2 * * *" } });
}
