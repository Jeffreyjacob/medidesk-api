import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { globalRateLimit } from "./middleware/ratelimit";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { logger } from "./config/logger";
import { nanoid } from "nanoid";
import { HealthCheck } from "./shared/healthCheck/healthCheck";
import { NotFoundMiddleware } from "./middleware/notFoundHandler";
import { errorHandlerMiddleware } from "./middleware/errorHandler";
import { registerAllListeners } from "./events/listeners";
import authRoutes from "./modules/authentication/auth.routes";
import clinicRoutes from "./modules/clinic/clinic.routes";
import billingRoutes from "./modules/billing/billing.routes";
import scheduleRoutes from "./modules/schedule/schedule.routes";
import patientRoutes from "./modules/patients/patient.routes";

class App {
  public readonly express: Application;
  constructor() {
    this.express = express();
    registerAllListeners();
    this.setSecurityMiddleware();
    this.setParsingMiddleware();
    this.setLoggingMiddleware();
    this.setRouteMiddlewares();
    this.setErrorMiddleware();
  }

  setSecurityMiddleware() {
    this.express.use(helmet());
    this.express.use(
      cors({
        origin:
          env.NODE_ENV === "production" ? env.ALLOWED_ORIGIN.split(",") : "*",
        methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"],
        allowedHeaders: ["Authorization", "Content-Type"],
      }),
    );
    this.express.use(globalRateLimit);
    this.express.use(compression());
  }

  setParsingMiddleware() {
    this.express.use((req, res, next) => {
      if (req.originalUrl === "api/v1/billing/webhook") {
        express.raw({ type: "application/json" })(req, res, next);
      } else {
        express.json()(req, res, next);
      }
    });

    this.express.use(express.urlencoded({ extended: true, limit: "10mb" }));
    this.express.set("trust proxy", 1);
    this.express.use(cookieParser());
  }

  setLoggingMiddleware() {
    if (env.NODE_ENV === "development") {
      this.express.use(morgan("dev"));
    } else if (env.NODE_ENV === "production") {
      this.express.use(
        morgan("combined", {
          stream: {
            write: (message) => logger.info(message.trim()),
          },
        }),
      );
    }

    this.express.use((req, res, next) => {
      const correlationId =
        (req.headers["x-correlation-id"] as string) ?? nanoid();
      req.headers["x-correlation-id"] = correlationId;
      req.requestId = correlationId;
      req.log = logger.child({ correlationId });
      res.setHeader("x-correlation-id", correlationId);
      next();
    });
  }

  setRouteMiddlewares() {
    const healthCheck = new HealthCheck();
    this.express.get("/health", async (_req, res) => {
      const health = await healthCheck.getHealth();
      const statusCode = health.status === "healthy" ? 200 : 503;
      res.status(statusCode).json(health);
    });
    this.express.use("/api/v1/auth/", authRoutes);
    this.express.use("/api/v1/clinic/", clinicRoutes);
    this.express.use("/api/v1/billing/", billingRoutes);
    this.express.use("/api/v1/schedule/", scheduleRoutes);
    this.express.use("/api/v1/patient/", patientRoutes);
  }

  setErrorMiddleware() {
    this.express.use(NotFoundMiddleware);
    this.express.use(errorHandlerMiddleware);
  }
}

export const app = new App().express;
