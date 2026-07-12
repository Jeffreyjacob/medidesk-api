import { Queue } from "bullmq";
import { getEmailQueue } from "./queues/email";

export const allQueue4DLQ: Queue[] = [getEmailQueue()];
export const allQueue: Queue[] = [getEmailQueue()];
