import { Request } from "express";
import { redis } from "../../config/redis";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import { AppError } from "../errors";
import { SubscriptionStatus } from "../../generated/prisma/enums";

export async function ensureIdempotency(jobId: String, workerType: string) {
  const key = `processed:${workerType}:${jobId}`;
  const acquired = await redis.set(key, "1", "EX", 86400, "NX");
  return acquired === "OK";
}

export async function clearIdempotency(jobId: string, workerType: string) {
  const key = `processed:${workerType}:${jobId}`;
  await redis.del(key);
}

export function generateOtp(): string {
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString();
}

export function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}
export function generateInvitationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashInvitationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const escapeHtml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface DevicInfo {
  browser: string;
  os: string;
  device: string;
  ip: string;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

export function getDevicInfo(req: Request): DevicInfo {
  const parser = new UAParser(req.headers["user-agent"]);
  const result = parser.getResult();

  return {
    browser:
      `${result.browser.name ?? "unknown"} ${result.browser.version ?? ""}`.trim(),
    os: `${result.os.name ?? "unknowm"} ${result.os.version ?? ""}`.trim(),
    device: result.device.type ?? "desktop",
    ip: getClientIp(req),
  };
}

export function getLocationFromIp(ip: string) {
  const geo = geoip.lookup(ip);
  return geo
    ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        ll: geo.ll,
      }
    : null;
}

export function isTransientError(err: Error): boolean {
  const transientMessage = [
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "socket hang up",
    "SMTP",
  ];

  return transientMessage.some((msg) =>
    err.message.toLocaleUpperCase().includes(msg.toLocaleUpperCase()),
  );
}

export function isPermanentError(err: Error): boolean {
  if (err instanceof AppError) {
    return true;
  }
  return false;
}

export function classifyError(
  err: Error,
): "transient" | "permanent" | "unknown" {
  if (isTransientError(err)) return "transient";
  if (err instanceof AppError) {
    switch (err.statusCode) {
      case 400:
      case 422:
      case 404:
      case 409:
      case 403:
        return "permanent";
      case 401:
      case 429:
        return "transient";
      case 500:
        return "transient";
      default:
        return "unknown";
    }
  }
  return "unknown";
}

export const mapStripeStatusToInternal = (
  stripeStatus: string,
): SubscriptionStatus => {
  switch (stripeStatus) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELLED;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "incomplete":
      return SubscriptionStatus.INCOMPLETE;
    default:
      return SubscriptionStatus.PAST_DUE;
  }
};

export function hashToInt64(key: string): bigint {
  const hash = crypto.createHash("sha256").update(key).digest();
  const truncated = hash.readBigInt64BE(0);
  return truncated & 0x7fffffffffffffffn;
}
