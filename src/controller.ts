import { stripe } from "./config/stripe";
import { AuthController } from "./modules/authentication/auth.controller";
import {
  AuthRepository,
  EmailVerificationRespository,
  PasswordResetTokenRepository,
  RefreshTokenRepository,
} from "./modules/authentication/auth.repository";
import { AuthService } from "./modules/authentication/auth.service";
import { BillingController } from "./modules/billing/billing.controller";
import {
  BillingHistoryRepository,
  StripeWebhookEventRepository,
  SubcriptionRepository,
} from "./modules/billing/billing.repository";
import { BillingService } from "./modules/billing/billing.service";
import { ClinicController } from "./modules/clinic/clinic.controller";
import {
  ClinicInvitationRepository,
  ClinicMemberRepository,
  ClinicRepository,
} from "./modules/clinic/clinic.repository";
import { ClinicService } from "./modules/clinic/clinic.service";
import { ScheduleRepository } from "./modules/schedule/schedule.repository";
import { TimeSlotRepository } from "./modules/timeslot/timeslot.repository";

const authRepo = new AuthRepository();
const emailVerificationRepo = new EmailVerificationRespository();
const passwordResetTokenRepo = new PasswordResetTokenRepository();
const refreshTokenRepo = new RefreshTokenRepository();
export const clinicRepo = new ClinicRepository();
export const clinicMemberRepo = new ClinicMemberRepository();
export const clinicInvitationRepo = new ClinicInvitationRepository();
export const subscriptionRepo = new SubcriptionRepository();
const billingHistoryRepo = new BillingHistoryRepository();
const stripeWebhookEventRepo = new StripeWebhookEventRepository();
export const scheduleRepo = new ScheduleRepository();
export const timeSlotRepo = new TimeSlotRepository();

const authService = new AuthService(
  authRepo,
  passwordResetTokenRepo,
  emailVerificationRepo,
  refreshTokenRepo,
  clinicMemberRepo,
);
const clinicService = new ClinicService(
  clinicRepo,
  clinicMemberRepo,
  clinicInvitationRepo,
  authRepo,
);
export const billingService = new BillingService(
  clinicRepo,
  stripeWebhookEventRepo,
  subscriptionRepo,
  billingHistoryRepo,
  authRepo,
  clinicMemberRepo,
  stripe,
);

export const authController = new AuthController(authService);
export const clinicController = new ClinicController(clinicService);
export const billingController = new BillingController(billingService);
