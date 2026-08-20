/*
  Warnings:

  - Added the required column `doctorId` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "doctorId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Appointment_clinicId_doctorId_status_idx" ON "Appointment"("clinicId", "doctorId", "status");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_patientId_idx" ON "Appointment"("clinicId", "patientId");
