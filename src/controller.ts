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

const authRepo = new AuthRepository();
const emailVerificationRepo = new EmailVerificationRespository();
const passwordResetTokenRepo = new PasswordResetTokenRepository();
const refreshTokenRepo = new RefreshTokenRepository();
const clinicRepo = new ClinicRepository();
const clinicMemberRepo = new ClinicMemberRepository();
export const clinicInvitationRepo = new ClinicInvitationRepository();
const subscriptionRepo = new SubcriptionRepository();
const billingHistoryRepo = new BillingHistoryRepository();
const stripeWebhookEventRepo = new StripeWebhookEventRepository();

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
