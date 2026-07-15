import { env } from "../../config/env";
import { User } from "../../generated/prisma/client";
import jwt from "jsonwebtoken";
import { ITokenPayload } from "../../modules/authentication/auth.interface";
import crypto from "crypto";
import { Response } from "express";

export const generateAccessToken = (user: ITokenPayload): string => {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      ...(user.clinicId && { clinicId: user.clinicId }),
      ...(user.role && { role: user.role }),
    },
    env.JWT_SECRET as string,
    {
      expiresIn: env.JWT_SECRET as string,
      issuer: "medidesk_api",
      audience: "medidesk-client",
    } as jwt.SignOptions,
  );
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: "medidesk_api",
    audience: "medidesk-client",
  }) as ITokenPayload;
};

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto
    .createHmac("sha256", env.REFRESH_TOKEN_SECRET)
    .update(token)
    .digest("hex");
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function setRefreshTokenCookie(
  res: Response,
  refreshToken: string,
): void {
  res.cookie(env.REFRESH_TOKEN_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(env.REFRESH_TOKEN_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}
