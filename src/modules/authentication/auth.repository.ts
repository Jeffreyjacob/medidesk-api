import { prisma } from "../../config/database";
import {
  EmailVerificationOTP,
  PasswordResetToken,
  Prisma,
  RefreshToken,
  User,
} from "../../generated/prisma/client";
import {
  EmailVerificationOTPDelegate,
  UserDelegate,
} from "../../generated/prisma/models";
import { BaseRepository } from "../../shared/repository/baseRepository";

export class AuthRepository extends BaseRepository<UserDelegate, User> {
  constructor() {
    super(() => prisma.user);
  }

  async createUser({
    data,
    select,
  }: {
    data: Prisma.UserCreateInput;
    select: Prisma.Args<Prisma.UserDelegate, "create">["select"];
  }): Promise<User> {
    return this.create({
      data: {
        ...data,
      },
      select,
    });
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.findFirst({
      where: {
        id: userId,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findFirst({
      where: {
        email,
      },
    });
  }

  async updateUserById({
    id,
    data,
  }: {
    id: string;
    data: Prisma.UserUpdateInput;
  }): Promise<User | null> {
    return this.update({ where: { id }, data });
  }
}

export class EmailVerificationRespository extends BaseRepository<
  EmailVerificationOTPDelegate,
  EmailVerificationOTP
> {
  constructor() {
    super(() => prisma.emailVerificationOTP);
  }

  async createOtp(args: {
    userId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationOTP> {
    return this.create({
      data: {
        ...args,
      },
    });
  }

  async increaseOtpAttempt({
    id,
  }: {
    id: string;
  }): Promise<EmailVerificationOTP | null> {
    return this.update({
      where: {
        id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  async findEmailOtp({
    userId,
    codeHash,
  }: {
    userId: string;
    codeHash: string;
  }): Promise<EmailVerificationOTP | null> {
    return this.findFirst({
      where: {
        userId,
        codeHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });
  }

  async updateOtpUsedAt({
    id,
    usedAt,
  }: {
    id: string;
    usedAt: Date;
  }): Promise<EmailVerificationOTP | null> {
    return this.update({
      where: { id },
      data: { usedAt },
    });
  }
}

export class PasswordResetTokenRepository extends BaseRepository<
  Prisma.PasswordResetTokenDelegate,
  PasswordResetToken
> {
  constructor() {
    super(() => prisma.passwordResetToken);
  }

  async createPasswordToken({
    userId,
    tokenHash,
    expiresAt,
  }: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return this.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findPasswordToken({
    userId,
    tokenHash,
  }: {
    userId: string;
    tokenHash: string;
  }): Promise<PasswordResetToken | null> {
    return this.findFirst({
      where: {
        userId,
        tokenHash,
        expiresAt: { gte: new Date() },
        usedAt: null,
      },
    });
  }

  async updateResetTokenUsedAt({
    id,
    usedAt,
  }: {
    id: string;
    usedAt: Date;
  }): Promise<PasswordResetToken | null> {
    return this.update({
      where: {
        id,
      },
      data: {
        usedAt,
      },
    });
  }
}

export class RefreshTokenRepository extends BaseRepository<
  Prisma.RefreshTokenDelegate,
  RefreshToken
> {
  constructor() {
    super(() => prisma.refreshToken);
  }

  async createRefreshToken(args: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    replaceByTokenId?: string;
  }): Promise<RefreshToken> {
    return this.create({
      data: {
        ...args,
      },
    });
  }

  async invalidateRefreshToken(args: {
    id: string;
    revokedAt: Date;
    replaceByTokenId?: string;
  }): Promise<RefreshToken | null> {
    return this.update({
      where: {
        id: args.id,
      },
      data: {
        ...(args.replaceByTokenId && {
          replaceByTokenId: args.replaceByTokenId,
        }),
        revokedAt: args.revokedAt,
      },
    });
  }

  async findRefreshToken({
    tokenHash,
  }: {
    tokenHash: string;
  }): Promise<RefreshToken | null> {
    return this.findUnique({
      where: {
        tokenHash,
      },
    });
  }

  async revokeAllActiveTokensForUser(
    userId: string,
  ): Promise<Prisma.BatchPayload> {
    return this.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}
