-- This is an empty migration.
CREATE UNIQUE INDEX "Subscription_one_active_per_clinic"
ON "Subscription" ("clinicId")
WHERE "status" IN ('ACTIVE', 'PAST_DUE');