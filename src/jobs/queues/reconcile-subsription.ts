import { Queue } from "bullmq";
import { bullmqconnections } from "../../config/bullmq";

let reconcileSubscriptionQueue: Queue | null = null;

export const getReconcileSubscription = (): Queue => {
  if (!reconcileSubscriptionQueue) {
    reconcileSubscriptionQueue = new Queue("reconcileSubscription", {
      connection: bullmqconnections,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 60_000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  return reconcileSubscriptionQueue;
};
