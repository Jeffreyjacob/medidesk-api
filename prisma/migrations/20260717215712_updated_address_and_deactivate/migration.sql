-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "address" TEXT,
ADD COLUMN     "deactivate" BOOLEAN NOT NULL DEFAULT false;
