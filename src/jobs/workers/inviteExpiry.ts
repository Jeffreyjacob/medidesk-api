import { Worker, Job } from "bullmq";
import { ClinicInvitationRepository } from "../../modules/clinic/clinic.repository";
import { InviteExpiryProcesser } from "../processer/inviteExpiry";
import { bullmqconnections } from "../../config/bullmq";
import { logger } from "../../config/logger";

export interface IInviteExpiryData {
  inviteId: string;
  clinicId: string;
}

export const createInviteExpiryWorker = (
  clinicInvitationRepo: ClinicInvitationRepository,
): Worker => {
  const worker = new Worker(
    "inviteExpiry",
    async (job: Job<IInviteExpiryData>) => {
      return await InviteExpiryProcesser(job, clinicInvitationRepo);
    },
    {
      connection: bullmqconnections,
    },
  );

  worker.on("ready", () => {
    logger.info("invite expiry worker is ready");
  });

  worker.on("completed", (job) => {
    logger.info(
      { inviteId: job.data.inviteId },
      "invite expiry worker has runned",
    );
  });

  worker.on("failed", (job, err) => {
    logger.warn({ err, jobId: job?.id }, "Invite Expiry failed to run");
  });

  worker.on("error", (err) => {
    logger.warn({ err }, "invite expiry worker failed");
  });

  return worker;
};
