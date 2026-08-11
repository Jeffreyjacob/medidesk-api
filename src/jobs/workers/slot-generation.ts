import { Job, Worker } from "bullmq";
import { slotGenerationProcessor } from "../processer/slot-generation";
import { bullmqconnections } from "../../config/bullmq";
import { logger } from "../../config/logger";
import { ScheduleRepository } from "../../modules/schedule/schedule.repository";

export function createSlotGenerationWorker(
  scheduleRepo: ScheduleRepository,
): Worker {
  const worker = new Worker(
    "slot-generation",
    (job: Job) => {
      return slotGenerationProcessor(job, scheduleRepo);
    },
    {
      connection: bullmqconnections,
      concurrency: 5,
    },
  );

  worker.on("ready", () => logger.info("Slot generation worker is ready"));
  worker.on("failed", (job, err) =>
    logger.warn(
      { err, JobId: job?.id, jobName: job?.name },
      "Slot generation job failed",
    ),
  );
  worker.on("error", (err) => logger.warn({ err }, "Slot generation worker"));

  return worker;
}
