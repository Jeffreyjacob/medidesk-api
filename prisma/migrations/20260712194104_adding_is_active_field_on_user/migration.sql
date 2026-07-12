-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "EmailVerificationOTP_userId_codeHash_idx" ON "EmailVerificationOTP"("userId", "codeHash");

-- CreateIndex
CREATE INDEX "EmailVerificationOTP_userId_codeHash_expiresAt_usedAt_idx" ON "EmailVerificationOTP"("userId", "codeHash", "expiresAt", "usedAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_tokenHash_idx" ON "PasswordResetToken"("userId", "tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_tokenHash_expiresAt_usedAt_idx" ON "PasswordResetToken"("userId", "tokenHash", "expiresAt", "usedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_tokenHash_idx" ON "RefreshToken"("userId", "tokenHash");
