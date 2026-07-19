import { Job } from "bullmq";
import { clearIdempotency, ensureIdempotency } from "../../shared/utils/helper";
import { ClinicInvitationRepository } from "../../modules/clinic/clinic.repository";
import { logger } from "../../config/logger";
import { InvitationStatus } from "../../generated/prisma/enums";
import { IInviteExpiryData } from "../workers/inviteExpiry";

export const InviteExpiryProcesser = async (
  job: Job<IInviteExpiryData>,
  clinicInvitatinRepo: ClinicInvitationRepository,
) => {
  const { inviteId, clinicId } = job.data;
  const canProceed = await ensureIdempotency(job.id!, job.queueName);
  if (!canProceed) return;
  try {
    const invitation = await clinicInvitatinRepo.findInvitationById({
      id: inviteId,
      clinicId,
    });

    if (!invitation) {
      logger.warn({ inviteId }, "Unable to find invitation for expiry");
      return;
    }

    if (
      invitation.status === InvitationStatus.ACCEPTED ||
      invitation.status === InvitationStatus.REVOKED
    ) {
      logger.warn({ inviteId }, "Invitation has been accepted or revoked");
      return;
    }

    if (invitation.status === InvitationStatus.EXPIRED) {
      logger.warn(
        { inviteId },
        "Invitation has already been marked as expired",
      );
    }

    await clinicInvitatinRepo.updateInvitation({
      id: invitation.id,
      clinicId,
      data: {
        status: InvitationStatus.EXPIRED,
        expiryJobId: null,
      },
    });
  } catch (error: any) {
    await clearIdempotency(job.id!, job.queueName);
    throw error;
  }
};
