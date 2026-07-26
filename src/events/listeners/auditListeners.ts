import { prisma } from "../../config/database";
import { eventBus } from "../eventBus";

export function auditListeners(): void {
  eventBus.on(
    "member.role_changed",
    async ({ clinic, changedBy, previousRole, newRole, member }) => {
      await prisma.auditLog.create({
        data: {
          clinicId: clinic.id,
          actorId: changedBy.id,
          action: "member.role_changed",
          metadata: {
            userId: member.userId,
            previousRole: previousRole,
            newRole: newRole,
          },
        },
      });
    },
  );

  eventBus.on("clinic.created", async ({ clinic, createdBy }) => {
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        actorId: createdBy,
        action: "clinic.created",
        metadata: {
          clinicName: clinic.name,
        },
      },
    });
  });

  eventBus.on("member.invitation_accepted", async ({ member, clinic }) => {
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        actorId: member.userId,
        action: "member.invitation_accepted",
        metadata: {
          clinicName: clinic.name,
          role: member.role,
          email: member.email,
        },
      },
    });
  });

  eventBus.on("member.removed", async ({ clinic, member, removedBy }) => {
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        actorId: removedBy.id,
        action: "member.removed",
        metadata: {
          userId: member.userId,
          clinicName: clinic.name,
        },
      },
    });
  });

  eventBus.on("clinic.plan_changed", async ({ clinicId, fromPlan, toPlan }) => {
    await prisma.auditLog.create({
      data: {
        clinicId,
        actorId: "Owner",
        action: "clinic.plan_changed",
        metadata: {
          fromPlan,
          toPlan,
        },
      },
    });
  });

  eventBus.on(
    "member.invitation_revoked",
    async ({ clinicId, revokedBy, invite }) => {
      await prisma.auditLog.create({
        data: {
          clinicId,
          actorId: revokedBy,
          action: "member.invitation_revoked",
          metadata: {
            inviteId: invite.id,
            inviteRole: invite.role,
            inviteEmail: invite.email,
          },
        },
      });
    },
  );

  eventBus.on("member.invited", async ({ clinic, invite, invitedBy }) => {
    await prisma.auditLog.create({
      data: {
        clinicId: clinic.id,
        actorId: invitedBy.id,
        action: "member.invited",
        metadata: {
          inviteId: invite.id,
          inviteRole: invite.role,
          inviteEmail: invite.email,
        },
      },
    });
  });
}
