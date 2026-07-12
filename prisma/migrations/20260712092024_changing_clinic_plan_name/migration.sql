/*
  Warnings:

  - The `plan` column on the `Clinic` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ClinicPlan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "Clinic" DROP COLUMN "plan",
ADD COLUMN     "plan" "ClinicPlan" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phone";

-- DropEnum
DROP TYPE "Plan";
