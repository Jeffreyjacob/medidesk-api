import { Queue } from "bullmq";
import { bullmqconnections } from "../../config/bullmq";

let inviteExpiryQueue: Queue | null;

export const getInviteExpiryEmail = (): Queue => {
  if (!inviteExpiryQueue) {
    inviteExpiryQueue = new Queue("inviteExpiry", {
      connection: bullmqconnections,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    });
  }

  return inviteExpiryQueue;
};
