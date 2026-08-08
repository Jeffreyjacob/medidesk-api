/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `Clinic` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Clinic" DROP COLUMN "stripeCustomerId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeCustomerId" TEXT;
