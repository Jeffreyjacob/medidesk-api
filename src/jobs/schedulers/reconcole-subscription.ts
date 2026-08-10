import { logger } from "../../config/logger";
import { getReconcileSubscription } from "../queues/reconcile-subsription";

export const scheduleSubscriptionReconcile = async () => {
  try {
    const queue = getReconcileSubscription();
    await queue.add(
      "reconcile-all-subscriptions",
      {},
      {
        repeat: {
          pattern: "0 3 * * *", // 03:00 daily
        },
        jobId: "daily-subscription-reconciliation-recurring",
      },
    );

    logger.info(
      { schedule: "0 3 * * *", component: "ReconcileSubscriptionScheduler" },
      "Daily subscription reconciliation job scheduled",
    );
  } catch (error: any) {
    logger.error(
      {
        component: "ReconcileSubscriptionScheduler",
        error,
      },
      "Failed to schedule daily subscription reconciliation",
    );
    throw error;
  }
};
