import { redis } from "../../config/redis";
import crypto from "crypto";

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
