import { ClinicRole } from "../../generated/prisma/enums";

export interface ICreateClinicResponse {
  id: string;
  name: string;
  plan: string;
}

export interface IGetUserClinicResponse {
  id: string;
  createdAt: Date;
  role: ClinicRole;
  userId: string;
  clinic: {
    id: string;
    name: string;
  };
}
