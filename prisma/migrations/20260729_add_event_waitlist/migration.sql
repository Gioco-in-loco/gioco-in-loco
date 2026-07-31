CREATE TABLE "event_waitlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "event_waitlists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_waitlists_userId_eventId_day_key" ON "event_waitlists"("userId", "eventId", "day");
CREATE INDEX "event_waitlists_eventId_day_notifiedAt_idx" ON "event_waitlists"("eventId", "day", "notifiedAt");

ALTER TABLE "event_waitlists" ADD CONSTRAINT "event_waitlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_waitlists" ADD CONSTRAINT "event_waitlists_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
