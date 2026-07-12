import { app } from "./app";
import { prisma } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import http from "http";

export async function startServer(): Promise<void> {
  try {
    logger.info("...starting server");
    const server = http.createServer(app);
    await prisma.$connect();
    server.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          env: env.NODE_ENV,
          pid: process.pid,
        },
        "Server is ready",
      );
    });

    const gracefullShutDown = (signal: string) => {
      logger.info({ signal }, "starting shut down");
      const forceExiter = setTimeout(() => {
        logger.info("shutting down with force exit");
        process.exit(1);
      });

      forceExiter.unref();

      server.close(async (err) => {
        try {
        } catch (cleanUpErr: any) {
          logger.error(
            { err: cleanUpErr, pid: process.pid },
            "unable to graceful shutdown server",
          );
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => gracefullShutDown("SIGTERM"));
    process.on("SIGINT", () => gracefullShutDown("SIGINT"));
    process.on("uncaughtException", (err) => {
      logger.fatal({ err, pid: process.pid });
      gracefullShutDown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason, pid: process.pid }, "unhandledRejection Error");
      gracefullShutDown("unhandleRejection");
    });
  } catch (error: any) {
    logger.fatal({ err: error, pid: process.pid }, "unabe to start server");
    process.exit(1);
  }
}

startServer();
