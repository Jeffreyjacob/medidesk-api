import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import { User } from "../../generated/prisma/client";
import { getEmailQueue } from "../../jobs/queues/email";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestError,
} from "../../shared/errors";
import { verifyEmailTemplate } from "../../shared/utils/email/verifyEmail";
import { generateOtp, hashOtp } from "../../shared/utils/helper";
import {
  IAuthMessage,
  ILoginResponse,
  IRegisterResponse,
} from "./auth.interface";
import {
  AuthRepository,
  EmailVerificationRespository,
  PasswordResetTokenRepository,
  RefreshTokenRepository,
} from "./auth.repository";
import {
  ILoginInput,
  IRegisterInput,
  IResendEmailVerificationInput,
  IVerifyEmailInput,
} from "./auth.validation";
import bcrypt from "bcryptjs";

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly passwordResetRepo: PasswordResetTokenRepository,
    private readonly emailVerificationRepo: EmailVerificationRespository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
  ) {}

  private async passwordHash(password: string): Promise<string> {
    return await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  private async comparePassword(
    candidatePassword: string,
    password: string,
  ): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, password);
  }

  async registerUser(data: IRegisterInput): Promise<IRegisterResponse> {
    const checkIfUserExist = await this.authRepo.exist({
      where: { email: data.email },
    });

    if (checkIfUserExist) throw new ConflictError("email already exist");

    const passwordHash = await this.passwordHash(data.password);
    const user = await this.authRepo.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        email: data.email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const otp = generateOtp();
    const today = new Date();
    const emailExpiresAt = new Date(today.getTime() + 60 * 60 * 1000);

    await this.emailVerificationRepo.createOtp({
      userId: user.id,
      codeHash: hashOtp(otp),
      expiresAt: emailExpiresAt,
    });

    const emailJob = getEmailQueue();
    const url = `${env.FRONTEND_URL}/verifyEmail?${user.email}`;

    try {
      await emailJob.add("email", {
        email: user.email,
        subject: "Verify your email",
        html: verifyEmailTemplate({
          code: otp,
          firstName: user.firstName,
          url,
          expiresIn: 60,
        }),
      });
    } catch (error: any) {
      logger.warn("unable to add job to email queue");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      message: "User created successfully!",
    };
  }

  async verifyEmail(data: IVerifyEmailInput): Promise<IAuthMessage> {
    const user = await this.authRepo.findFirst({
      where: { email: data.email },
    });
    if (!user) throw new NotFoundError("User not found");

    if (user.isEmailVerifed)
      throw new BadRequestError("User email has already been verified");

    const emailOtp = await this.emailVerificationRepo.findEmailOtp({
      userId: user.id,
      codeHash: hashOtp(data.code),
    });

    if (!emailOtp) throw new BadRequestError("Invalid or expired code");

    // updated user emailVerified boolean to true

    await this.authRepo.updateUserById({
      id: user.id,
      data: {
        isEmailVerifed: true,
      },
    });

    // update code to used

    await this.emailVerificationRepo.updateOtpUsedAt({
      id: emailOtp.id,
      usedAt: new Date(),
    });

    return {
      message: "email has been verified",
    };
  }

  async resendVerificationEmail(
    data: IResendEmailVerificationInput,
  ): Promise<IAuthMessage> {
    const user = await this.authRepo.findByEmail(data.email);

    const message =
      "If an unverified account exist with this email, a new otp code  has been sent to them";

    if (!user) {
      return {
        message,
      };
    }

    const cooldownKey = `cooldown:verify:${user.id}`;
    const onCoolDown = await redis.get(cooldownKey);

    if (onCoolDown) {
      const ttl = await redis.ttl(cooldownKey);
      throw new TooManyRequestError(
        `Please wait ${ttl} seconds before requesting another otp code`,
      );
    }

    const otp = generateOtp();
    const today = new Date();
    const expiresAt = new Date(today.getTime() + 60 * 60 * 1000);

    await this.emailVerificationRepo.createOtp({
      userId: user.id,
      codeHash: hashOtp(otp),
      expiresAt,
    });

    await redis.set(cooldownKey, "1", "EX", 120);

    const emailJob = getEmailQueue();
    const url = `${env.FRONTEND_URL}/verifyEmail?${user.email}`;

    try {
      await emailJob.add("email", {
        email: user.email,
        subject: "Verify Your email",
        html: verifyEmailTemplate({
          url,
          code: otp,
          firstName: user.firstName,
        }),
      });
    } catch (error: any) {
      logger.warn("unable to add job to email queue");
    }

    return {
      message,
    };
  }

  async login(data: ILoginInput): Promise<ILoginResponse> {}
}
