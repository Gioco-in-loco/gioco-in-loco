ALTER TABLE "events"
ADD COLUMN "price" DOUBLE PRECISION;

CREATE TABLE "event_admissions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "pricePaid" DOUBLE PRECISION,
  "consentGiven" BOOLEAN NOT NULL DEFAULT false,
  "consentDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "event_admissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_admissions_userId_eventId_key" ON "event_admissions"("userId", "eventId");
CREATE INDEX "event_admissions_eventId_idx" ON "event_admissions"("eventId");

ALTER TABLE "event_admissions"
ADD CONSTRAINT "event_admissions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_admissions"
ADD CONSTRAINT "event_admissions_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "events"("id")
ON DELETE CASCADE ON UPDATE CASCADE;