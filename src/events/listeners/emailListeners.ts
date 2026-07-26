import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { getEmailQueue } from "../../jobs/queues/email";
import { accountLockedEmailTemplate } from "../../shared/utils/email/accountLockedEmail";
import { memberRemovedEmailTemplate } from "../../shared/utils/email/memberRemoveEmail";
import { memberRoleChangedEmailTemplate } from "../../shared/utils/email/memberRoleChangedEmail";
import { passwordChangedEmailTemplate } from "../../shared/utils/email/passwordChangedEmail";
import {
  buildExistingUserAddedEmail,
  buildNewUserWelcomeEmail,
} from "../../shared/utils/email/welcomeEmail";
import { eventBus } from "../eventBus";

export function emailListeners(): void {
  eventBus.on(
    "user.password_reset",
    async ({ email, firstName, location, changedAt, deviceInfo }) => {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email,
          subject: "Password Reset (Security Message)",
          html: passwordChangedEmailTemplate({
            firstName,
            location,
            changedAt,
            deviceInfo,
          }),
        });
      } catch (error: any) {
        logger.warn(
          { error, email },
          "Failed to  add to email queue password reset email",
        );
      }
    },
  );

  eventBus.on(
    "user.account_locked",
    async ({ email, firstName, unlockAt, reason }) => {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email,
          subject: "Your Account has been locked",
          html: accountLockedEmailTemplate({
            firstName,
            unlockAt,
            reason,
          }),
        });
      } catch (error: any) {
        logger.error(
          { error, email },
          "Failed to add to email queue  account lock email",
        );
      }
    },
  );

  eventBus.on(
    "member.invitation_accepted",
    async ({ member, clinic, wasNewUser }) => {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email: member.email,
          subject: `You've been added to a new clinic: ${clinic?.name}`,
          html: wasNewUser
            ? buildExistingUserAddedEmail({
                firstName: member.name,
                clinicName: clinic.name,
                role: member.role,
                dashboardUrl: `${env.FRONTEND_URL}/dashboard`,
              })
            : buildNewUserWelcomeEmail({
                firstName: member.name,
                clinicName: clinic.name,
                loginUrl: `${env.FRONTEND_URL}/login`,
              }),
        });
      } catch (error: any) {
        logger.error(
          { error },
          "Failed to queue new user email to email queue",
        );
      }
    },
  );

  eventBus.on(
    "member.role_changed",
    async ({ member, clinic, previousRole, newRole, changedBy }) => {
      try {
        const emailQueue = getEmailQueue();
        await emailQueue.add("email", {
          email: member.email,
          subject: `Your role in ${clinic.name} has been changed`,
          html: memberRoleChangedEmailTemplate({
            firstName: member.name,
            clinicName: clinic.name,
            oldRole: previousRole,
            newRole,
            changedBy: changedBy.name,
          }),
        });
      } catch (error: any) {
        logger.error(
          { error, userId: member.userId },
          "Failed to queue member role change email ",
        );
      }
    },
  );

  eventBus.on("member.removed", async ({ member, clinic, removedBy }) => {
    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("email", {
        email: member.email,
        subject: `You have been removed from ${clinic.name} clinic`,
        html: memberRemovedEmailTemplate({
          firstName: member.name,
          clinicName: clinic.name,
          removedBy: removedBy.name,
        }),
      });
    } catch (error: any) {
      logger.error(
        { error },
        "Unable to queue email to remove memeber from clinic",
      );
    }
  });
}
