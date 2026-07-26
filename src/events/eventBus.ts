import { EventEmitter } from "node:stream";
import { ClinicPlan, ClinicRole } from "../generated/prisma/enums";
import { logger } from "../config/logger";

// schedule.created
// schedule.updated
// schedule.deleted

// appointment.booked
// appointment.cancelled_by_patient
// appointment.cancelled_by_provider
// appointment.completed
// appointment.no_show

// medical_record.created

// invoice.created
// invoice.paid
// invoice.refunded
// subscription.seat_count_changed   // internal event YOUR code emits after successfully syncing to Stripe

interface AppEvents {
  "user.password_reset": {
    email: string;
    firstName: string;
    changedAt: string;
    deviceInfo: string;
    location: string;
  };
  "user.account_locked": {
    firstName: string;
    email: string;
    unlockAt: string;
    reason?: string;
  };
  "clinic.created": {
    clinic: { id: string; name: string; address?: string };
    createdBy: string;
  };
  "clinic.plan_changed": {
    clinicId: string;
    fromPlan: ClinicPlan;
    toPlan: ClinicPlan;
  };
  "member.invited": {
    invite: {
      id: string;
      email: string;
      role: ClinicRole;
      expiresAt: string;
    };
    clinic: { id: string; name: string };
    invitedBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  "member.invitation_accepted": {
    member: {
      userId: string;
      email: string;
      name: string;
      clinicId: string;
      role: ClinicRole;
    };
    clinic: { id: string; name: string };
    wasNewUser: boolean;
  };
  "member.invitation_revoked": {
    invite: { id: string; email: string; role: ClinicRole };
    clinicId: string;
    revokedBy: string;
  };
  "member.role_changed": {
    member: { userId: string; email: string; name: string };
    clinic: { id: string; name: string };
    previousRole: ClinicRole;
    newRole: ClinicRole;
    changedBy: { id: string; name: string };
  };
  "member.removed": {
    member: { userId: string; email: string; name: string };
    clinic: { id: string; name: string };
    removedBy: { id: string; name: string };
    role: ClinicRole;
  };
}

class TypedEventBus extends EventEmitter {
  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): boolean {
    return super.emit(event as string, payload);
  }

  on<K extends keyof AppEvents>(
    event: K,
    listener: (payload: AppEvents[K]) => void | Promise<void>,
  ): this {
    const safeListner = async (payload: AppEvents[K]) => {
      try {
        await Promise.resolve(listener(payload));
      } catch (err: any) {
        logger.error(
          { err, event },
          `Event Listener failed for event: ${event}`,
        );
      }
    };

    return super.on(event as string, safeListner);
  }
  off<K extends keyof AppEvents>(
    event: K,
    listener: (payload: AppEvents[K]) => void,
  ): this {
    return super.off(event as string, listener);
  }
}

export const eventBus = new TypedEventBus();
export type { AppEvents };
