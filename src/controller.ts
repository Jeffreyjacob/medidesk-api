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
import { PatientController } from "./modules/patients/patients.controller";
import { PatientRepository } from "./modules/patients/patients.repository";
import { PatientService } from "./modules/patients/patients.service";
import { ScheduleController } from "./modules/schedule/schedule.controller";
import { ScheduleRepository } from "./modules/schedule/schedule.repository";
import { ScheduleService } from "./modules/schedule/schedule.service";
import { TimeSlotController } from "./modules/timeslot/timeslot.controller";
import { TimeSlotRepository } from "./modules/timeslot/timeslot.repository";
import { TimeSlotService } from "./modules/timeslot/timeslot.service";

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
export const patientRepo = new PatientRepository();

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

export const scheduleService = new ScheduleService(
  scheduleRepo,
  timeSlotRepo,
  clinicMemberRepo,
);

export const timeSlotService = new TimeSlotService(
  timeSlotRepo,
  clinicMemberRepo,
  clinicRepo,
  scheduleRepo,
);

export const patientService = new PatientService(patientRepo, clinicRepo);

export const authController = new AuthController(authService);
export const clinicController = new ClinicController(clinicService);
export const billingController = new BillingController(billingService);
export const scheduleController = new ScheduleController(scheduleService);
export const timeslotController = new TimeSlotController(timeSlotService);
export const patientController = new PatientController(patientService);
