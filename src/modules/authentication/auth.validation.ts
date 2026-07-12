import z from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*]/, "Password must contain at least one special character");

export const registerSchema = z.object({
  firstName: z.string().min(1, { message: "first name is required" }).max(100),
  lastName: z.string().min(1, { message: "last name is required" }).max(100),
  email: z.string().email("Invalid email addres").lowercase(),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  email: z.string().email("invalid email address").toLowerCase(),
  code: z.string().min(1, "Code is required").max(6),
});

export const resendEmailVerificationSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, { message: "password is required" }),
});

export const forgetPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "token is required"),
  newPassword: passwordSchema,
});

export type IRegisterInput = z.infer<typeof registerSchema>;
export type IVerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type IResendEmailVerificationInput = z.infer<
  typeof resendEmailVerificationSchema
>;
export type ILoginInput = z.infer<typeof loginSchema>;
export type IForgetPasswordInput = z.infer<typeof forgetPasswordSchema>;
export type IResetPasswordInput = z.infer<typeof resetPasswordSchema>;
