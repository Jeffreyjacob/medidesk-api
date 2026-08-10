import { Worker } from "bullmq";
import { reconcileSubscriptionProcessor } from "../processer/reconcole-subscription";
import { bullmqconnections } from "../../config/bullmq";
import { logger } from "../../config/logger";

export const createReconcileSubscriptionWorker = (): Worker => {
  const worker = new Worker(
    "reconcileSubscription",
    reconcileSubscriptionProcessor,
    {
      connection: bullmqconnections,
    },
  );

  worker.on("ready", () => {
    logger.info("invite expiry worker is ready");
  });

  worker.on("failed", (job, err) => {
    logger.warn(
      { err, jobId: job?.id },
      "reconcile subscription failed to run",
    );
  });

  worker.on("error", (err) => {
    logger.warn({ err }, "reconcile subscription worker failed");
  });

  return worker;
};
