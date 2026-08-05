ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'HOLD';
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "event_admissions"
ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

ALTER TABLE "reservations"
ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

CREATE INDEX "event_admissions_status_holdExpiresAt_idx"
ON "event_admissions"("status", "holdExpiresAt");

CREATE INDEX "reservations_slotId_status_holdExpiresAt_idx"
ON "reservations"("slotId", "status", "holdExpiresAt");

CREATE INDEX "reservations_userId_status_holdExpiresAt_idx"
ON "reservations"("userId", "status", "holdExpiresAt");