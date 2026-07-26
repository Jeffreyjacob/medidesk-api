import { AuthController } from "./modules/authentication/auth.controller";
import {
  AuthRepository,
  EmailVerificationRespository,
  PasswordResetTokenRepository,
  RefreshTokenRepository,
} from "./modules/authentication/auth.repository";
import { AuthService } from "./modules/authentication/auth.service";
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

export const authController = new AuthController(authService);
export const clinicController = new ClinicController(clinicService);
