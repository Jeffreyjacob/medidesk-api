import { NextFunction, Request, Response } from "express";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../shared/errors";
import { verifyAccessToken } from "../shared/utils/tokenUtils";
import { clinicRepo } from "../controller";
import { ClinicPlan } from "../generated/prisma/enums";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    next(error);
  }
};

export const requireClinic = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.user?.clinicId) {
    throw new UnauthorizedError("No clinic selected Please activate a worker");
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.role) {
      throw new UnauthorizedError("No clinic context");
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `This action requires one of these roles: ${roles.join(",")}`,
      );
    }
    next();
  };
};

export const requirePro = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clinicId = req.user?.clinicId!;
    const clinic = await clinicRepo.findClinicById(clinicId);
    if (!clinic) {
      return next(new NotFoundError("clinic not found"));
    }
    if (clinic.plan !== ClinicPlan.PRO) {
      return next(
        new BadRequestError(
          "this feature requires a PRO subscription, please upgrade",
        ),
      );
    }
    next();
  };
};
