-- CreateTable
CREATE TABLE "event_reminder_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL,
    "sentBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_reminder_logs_eventId_kind_createdAt_idx" ON "event_reminder_logs"("eventId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "event_reminder_logs" ADD CONSTRAINT "event_reminder_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
