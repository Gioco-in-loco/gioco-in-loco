ALTER TABLE "main_event_reservations"
ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

CREATE INDEX "main_event_reservations_slotId_status_holdExpiresAt_idx"
ON "main_event_reservations"("slotId", "status", "holdExpiresAt");

CREATE INDEX "main_event_reservations_userId_status_holdExpiresAt_idx"
ON "main_event_reservations"("userId", "status", "holdExpiresAt");
