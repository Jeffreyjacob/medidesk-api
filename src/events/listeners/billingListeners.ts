import { logger } from "../../config/logger";
import { ClinicRole } from "../../generated/prisma/enums";
import { BillingService } from "../../modules/billing/billing.service";
import { eventBus } from "../eventBus";

export function seatSyncListeners(billingService: BillingService) {
  eventBus.on("member.invitation_accepted", async ({ member }) => {
    if (member.role !== ClinicRole.DOCTOR) return;
    await safeSyncSeatCount(billingService, member.clinicId);
  });

  eventBus.on(
    "member.role_changed",
    async ({ clinic, previousRole, newRole }) => {
      const affectsDoctorCount =
        previousRole === ClinicRole.DOCTOR || newRole === ClinicRole.DOCTOR;
      if (!affectsDoctorCount) return;
      await safeSyncSeatCount(billingService, clinic.id);
    },
  );

  eventBus.on("member.removed", async ({ clinic, role }) => {
    if (role !== ClinicRole.DOCTOR) return;
    await safeSyncSeatCount(billingService, clinic.id);
  });
}

async function safeSyncSeatCount(
  billingService: BillingService,
  clinicId: string,
) {
  try {
    await billingService.syncSeatCount(clinicId);
  } catch (err: any) {
    logger.error({ err, clinicId }, "Failed to sync stripe seat count");
  }
}
