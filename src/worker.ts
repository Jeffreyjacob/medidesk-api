import { disconnect } from "node:cluster";
import { prisma } from "./config/database";
import { logger } from "./config/logger";
import { clinicInvitationRepo } from "./controller";
import { createEmailWorker } from "./jobs/workers/email";
import { createInviteExpiryWorker } from "./jobs/workers/inviteExpiry";
import { disconnectRedis } from "./config/redis";
import { createReconcileSubscriptionWorker } from "./jobs/workers/reconcile-subcription";

export async function startWorker() {
  try {
    logger.info("starting worker");
    await prisma.$connect();
    const emailWorker = createEmailWorker();
    const inviteExpiryWorker = createInviteExpiryWorker(clinicInvitationRepo);
    const reconcileSubscriptionWorker = createReconcileSubscriptionWorker();

    const gracefulShutdown = async (signal: string) => {
      logger.info("starting graceful shutdown...");

      const forceExiter = setTimeout(() => {
        logger.info("force shutdown");
        process.exit(1);
      }, 10_000);

      forceExiter.unref();

      try {
        await prisma.$disconnect();
        await emailWorker.close();
        await inviteExpiryWorker.close();
        await reconcileSubscriptionWorker.close();
        await disconnectRedis();
        process.exit(0);
      } catch (error: any) {
        logger.fatal({ error }, "unable to gracefully shutdown worker server");
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("uncaughtException", (err) => {
      logger.fatal({ err }, "uncaught exeception worker");
      gracefulShutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason }, " unhandledRejection worker");
      gracefulShutdown("unhandledRejection");
    });
  } catch (error: any) {
    logger.fatal({ error }, "Unable to start worker ");
    process.exit(1);
  }
}

startWorker();
