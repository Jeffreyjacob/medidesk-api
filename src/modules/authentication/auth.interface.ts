import { ClinicPlan, ClinicRole } from "../../generated/prisma/enums";

export interface IRegisterResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  message: string;
}

export interface ILoginResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  accessToken: string;
}

export interface IActivateClinicResponse {
  accessToken: string;
  clinic: {
    id: string;
    name: string;
    plan: ClinicPlan;
  };
}

export interface IRefreshTokenResponse {
  accessToken: string;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  clinicId?: string;
  role?: ClinicRole;
}

export interface IAuthMessage {
  message: string;
}
