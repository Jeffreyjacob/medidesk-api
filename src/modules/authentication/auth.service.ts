import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { redis } from "../../config/redis";
import { getEmailQueue } from "../../jobs/queues/email";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestError,
  UnauthorizedError,
} from "../../shared/errors";
import {
  resetPasswordEmailTemplate,
  verifyEmailTemplate,
} from "../../shared/utils/email/verifyEmail";
import { generateOtp, hashOtp } from "../../shared/utils/helper";
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  hashRefreshToken,
} from "../../shared/utils/tokenUtils";
import { ClinicMemberRepository } from "../clinic/clinic.repository";
import {
  IAuthMessage,
  ILoginResponse,
  IRefreshTokenResponse,
  IRegisterResponse,
} from "./auth.interface";
import {
  AuthRepository,
  EmailVerificationRespository,
  PasswordResetTokenRepository,
  RefreshTokenRepository,
} from "./auth.repository";
import {
  IForgetPasswordInput,
  ILoginInput,
  IRegisterInput,
  IResendEmailVerificationInput,
  IResetPasswordInput,
  IVerifyEmailInput,
} from "./auth.validation";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly passwordResetRepo: PasswordResetTokenRepository,
    private readonly emailVerificationRepo: EmailVerificationRespository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly clinicMemberRepo: ClinicMemberRepository,
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
    const user = await this.authRepo.createUser({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        email: data.email,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
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
          firstName: user.firstName!,
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
        firstName: user.firstName!,
        lastName: user.lastName!,
      },
      message: "User created successfully!",
    };
  }

  async verifyEmail(data: IVerifyEmailInput): Promise<IAuthMessage> {
    const user = await this.authRepo.findByEmail(data.email);
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
          firstName: user.firstName!,
        }),
      });
    } catch (error: any) {
      logger.warn("unable to add job to email queue");
    }

    return {
      message,
    };
  }

  async login(data: ILoginInput): Promise<ILoginResponse> {
    let user = await this.authRepo.findByEmail(data.email);

    if (
      user &&
      user.lockedUntil &&
      new Date(user.lockedUntil).getTime() < Date.now()
    ) {
      await this.authRepo.updateUserById({
        id: user.id,
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      user = {
        ...user,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };
    }

    if (
      user &&
      user.lockedUntil &&
      new Date(user.lockedUntil).getTime() > Date.now() &&
      user.failedLoginAttempts > 5
    ) {
      const lockedTimeInMinutes =
        new Date(user.lockedUntil).getTime() / (60 * 1000);
      const currentTime = Date.now() / (60 * 1000);
      const minuteRemaining = Math.ceil(lockedTimeInMinutes - currentTime);
      throw new UnauthorizedError(
        `Your account has been locked due to failed login Attempt, Please try again in ${minuteRemaining} minutes`,
      );
    }

    const today = new Date();
    const dummyHash =
      "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234";

    const passwordMatch = await this.comparePassword(
      data.password,
      user?.passwordHash ?? dummyHash,
    );

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!passwordMatch) {
      const maxAtempt = 5;
      const currentAttempt = user.failedLoginAttempts + 1;
      const attemptLeft = maxAtempt - currentAttempt;

      if (currentAttempt >= maxAtempt) {
        const lockedUntil = new Date(today.getMinutes() + 30);
        await this.authRepo.updateUserById({
          id: user.id,
          data: {
            failedLoginAttempts: { increment: 1 },
            lockedUntil,
          },
        });

        throw new UnauthorizedError(
          "Your account has been locked to due too many failed login attempt, Please try again in 30 minutes",
        );
      }

      await this.authRepo.updateUserById({
        id: user.id,
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });

      throw new UnauthorizedError(
        `Invalid credentials, ${attemptLeft} ${attemptLeft == 1 ? "attempt" : "attempts"} left`,
      );
    }

    if (!user.isEmailVerifed) {
      throw new UnauthorizedError("Please verify your email before logging in");
    }

    if (!user.isActive) {
      throw new UnauthorizedError(
        "Your account has deactived. Please contact support",
      );
    }

    let clinicContext: any = {};

    if (user.lastActiveClinicId) {
      const memebership = await this.clinicMemberRepo.findMemberShip(
        user.id,
        user.lastActiveClinicId,
      );

      if (memebership) {
        clinicContext = {
          clinicId: memebership.clinicId,
          role: memebership.role,
        };
      }
    }
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      ...clinicContext,
    });

    const refreshToken = generateRefreshToken();
    const hashRefresh = hashRefreshToken(refreshToken);

    const refreshTokenExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000,
    );

    await this.refreshTokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefresh,
      expiresAt: refreshTokenExpiresAt,
    });

    await this.authRepo.updateUserById({
      id: user.id,
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName!,
        lastName: user.lastName!,
        email: user.email,
      },
      accessToken,
      refreshToken,
      activateClinic: clinicContext.clinicId ? true : false,
    };
  }

  async refreshToken(refreshToken: string): Promise<IRefreshTokenResponse> {
    const hashRefresh = hashRefreshToken(refreshToken);
    const refresh = await this.refreshTokenRepo.findRefreshToken({
      tokenHash: hashRefresh,
    });

    if (!refresh)
      throw new UnauthorizedError("Invalid, used or expired refresh token");

    if (
      refresh.revokedAt ||
      refresh.replaceByTokenId ||
      new Date(refresh.expiresAt).getTime() <= Date.now()
    ) {
      throw new UnauthorizedError("Invalid, used or expired refresh token");
    }

    const user = await this.authRepo.findUserById(refresh.userId);

    if (!user) throw new NotFoundError("User not found");

    let clinicContext = {};

    if (user.lastActiveClinicId) {
      const membership = await this.clinicMemberRepo.findMemberShip(
        user.id,
        user.lastActiveClinicId,
      );

      if (membership) {
        clinicContext = {
          clinicId: membership.clinicId,
          role: membership.role,
        };
      }
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      ...clinicContext,
    });

    const newRefresh = generateRefreshToken();
    const newHashRefresh = hashRefreshToken(newRefresh);

    const newRefreshToken = await this.refreshTokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash: newHashRefresh,
      expiresAt: new Date(
        Date.now() + env.REFRESH_TOKEN_EXPIRES_IN * 24 * 60 * 60 * 1000,
      ),
    });

    // revoked old refresh toke

    await this.refreshTokenRepo.invalidateRefreshToken({
      id: refresh.id,
      replaceByTokenId: newRefreshToken.id,
      revokedAt: new Date(),
    });

    return {
      accessToken,
      refreshToken: newRefresh,
    };
  }

  async forgetPassword(data: IForgetPasswordInput): Promise<IAuthMessage> {
    const user = await this.authRepo.findByEmail(data.email);

    const message =
      "If an account exist with this email, a reset password link would be sent to this email";

    if (!user) {
      return {
        message,
      };
    }

    const cooldownKey = `cooldown:reset:${user.id}`;
    const onCoolDown = await redis.get(cooldownKey);

    if (onCoolDown) {
      const ttl = await redis.ttl(cooldownKey);
      const minutes = Math.ceil(ttl / 60);
      throw new TooManyRequestError(
        `Please wait ${minutes} minutes before requesting`,
      );
    }

    const resetToken = generateVerificationToken();
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetRepo.createPasswordToken({
      userId: user.id,
      tokenHash: resetToken,
      expiresAt: resetExpiresAt,
    });

    await redis.set(cooldownKey, "1", "EX", 3600);

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${user.email}`;

    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("reset-password", {
        email: user.email,
        subject: "Forget Password Link",
        html: resetPasswordEmailTemplate(resetUrl, user.firstName!),
      });
    } catch (error: any) {
      logger.warn({ err: error }, "Failed to queue reset email");
    }

    return {
      message,
    };
  }

  async resetPassword(data: IResetPasswordInput): Promise<IAuthMessage> {
    const user = await this.authRepo.findByEmail(data.email);
    if (!user) throw new NotFoundError("User not found");
    const resetToken = await this.passwordResetRepo.findPasswordToken({
      userId: user.id,
      tokenHash: data.token,
    });

    if (!resetToken) throw new UnauthorizedError("Invalid or expired token");

    const passwordHash = await this.passwordHash(data.newPassword);

    await this.passwordResetRepo.updateResetTokenUsedAt({
      id: resetToken.id,
      usedAt: new Date(),
    });

    await this.refreshTokenRepo.revokeAllActiveTokensForUser(user.id);

    await this.authRepo.updateUserById({
      id: user.id,
      data: {
        passwordHash,
      },
    });

    return {
      message: "Your password has been reset successfully!",
    };
  }

  async logout(
    accessToken: string,
    refreshToken: string,
  ): Promise<IAuthMessage> {
    const refresh = await this.refreshTokenRepo.findRefreshToken({
      tokenHash: hashRefreshToken(refreshToken),
    });

    if (!refresh) throw new BadRequestError("invalid or expired token");

    if (
      refresh.revokedAt ||
      refresh.replaceByTokenId ||
      new Date(refresh.expiresAt).getTime() <= Date.now()
    ) {
      throw new UnauthorizedError("Invalid, used or expired refresh token");
    }

    await this.refreshTokenRepo.invalidateRefreshToken({
      id: refresh.id,
      revokedAt: new Date(),
    });

    const decoded = jwt.decode(accessToken) as { exp: number } | null;

    if (decoded?.exp) {
      const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);

      if (remainingSeconds > 0) {
        try {
          await redis.set(
            `BlacklistToken:${accessToken}`,
            "1",
            "EX",
            remainingSeconds,
          );
        } catch (error: any) {
          logger.warn({ err: error }, "unable to blacklist token");
        }
      }
    }

    return {
      message: "user has been logged out",
    };
  }

  async activateClinic(
    userId: string,
    clinicId: string,
  ): Promise<IRefreshTokenResponse> {
    const membership = await this.clinicMemberRepo.findMemberShip(
      userId,
      clinicId,
    );

    if (!membership)
      throw new UnauthorizedError("You do not have access to this clinic");

    const user = await this.authRepo.findUserById(userId);

    if (!user) throw new NotFoundError("User not found");

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      clinicId: membership.clinicId,
      role: membership.role,
    });

    const refreshToken = generateRefreshToken();
    const hashRefresh = hashRefreshToken(refreshToken);

    await this.refreshTokenRepo.createRefreshToken({
      userId,
      tokenHash: hashRefresh,
      expiresAt: new Date(),
    });

    await this.authRepo.updateUserById({
      id: user.id,
      data: { lastActiveClinicId: clinicId },
    });

    return { accessToken, refreshToken };
  }
}
