ALTER TABLE "events" ADD COLUMN "dailyPrice" DOUBLE PRECISION;

ALTER TABLE "event_admissions" ADD COLUMN "day" TEXT NOT NULL DEFAULT '';

DROP INDEX "event_admissions_userId_eventId_key";
CREATE UNIQUE INDEX "event_admissions_userId_eventId_day_key" ON "event_admissions"("userId", "eventId", "day");
