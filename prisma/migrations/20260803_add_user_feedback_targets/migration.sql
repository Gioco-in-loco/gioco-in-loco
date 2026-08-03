ALTER TABLE "user_feedback" ADD COLUMN "mainEventReservationId" TEXT;
ALTER TABLE "user_feedback" ADD COLUMN "eventAdmissionId" TEXT;

CREATE INDEX "user_feedback_mainEventReservationId_idx" ON "user_feedback"("mainEventReservationId");
CREATE INDEX "user_feedback_eventAdmissionId_idx" ON "user_feedback"("eventAdmissionId");

ALTER TABLE "user_feedback"
ADD CONSTRAINT "user_feedback_mainEventReservationId_fkey"
FOREIGN KEY ("mainEventReservationId") REFERENCES "main_event_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_feedback"
ADD CONSTRAINT "user_feedback_eventAdmissionId_fkey"
FOREIGN KEY ("eventAdmissionId") REFERENCES "event_admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
