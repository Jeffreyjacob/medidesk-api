import { Queue } from "bullmq";
import { getEmailQueue } from "./queues/email";
import { getInviteExpiryEmail } from "./queues/inviteExpiry";

export const allQueue4DLQ: Queue[] = [getEmailQueue(), getInviteExpiryEmail()];
export const allQueue: Queue[] = [getEmailQueue(), getInviteExpiryEmail()];
