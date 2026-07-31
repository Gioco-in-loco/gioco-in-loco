-- Add eventId (nullable for backfill)
ALTER TABLE "one_shot_slots" ADD COLUMN "eventId" TEXT;

-- Backfill from the oneshot's existing event link
UPDATE "one_shot_slots" s
SET "eventId" = (
  SELECT eos."eventId" FROM "event_one_shots" eos WHERE eos."oneShotId" = s."oneshotId" LIMIT 1
);

-- Make eventId required and add its FK
ALTER TABLE "one_shot_slots" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "one_shot_slots" ADD CONSTRAINT "one_shot_slots_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "one_shot_slots_eventId_idx" ON "one_shot_slots"("eventId");

-- Slots become an event-owned pool: a one-shot can be deleted without destroying
-- the slot, it just becomes available again for another one-shot at the same event.
ALTER TABLE "one_shot_slots" ALTER COLUMN "oneshotId" DROP NOT NULL;
ALTER TABLE "one_shot_slots" DROP CONSTRAINT "one_shot_slots_oneshotId_fkey";
ALTER TABLE "one_shot_slots" ADD CONSTRAINT "one_shot_slots_oneshotId_fkey" FOREIGN KEY ("oneshotId") REFERENCES "one_shots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
