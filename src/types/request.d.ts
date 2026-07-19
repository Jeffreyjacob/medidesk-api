import { Logger } from "pino";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
    log?: Logger;
    user?: {
      userId: string;
      email: string;
      clinicId?: string;
      role?: string;
    };
  }
}
