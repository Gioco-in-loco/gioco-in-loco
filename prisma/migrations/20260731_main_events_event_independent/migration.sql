-- main_event_slots: diventa un pool di tavoli per-evento (mirror di one_shot_slots).
-- Backfill dell'eventId dal main_event a cui il tavolo appartiene oggi (dato da preservare).
ALTER TABLE "main_event_slots" ADD COLUMN "eventId" TEXT;

UPDATE "main_event_slots" ms
SET "eventId" = me."eventId"
FROM "main_events" me
WHERE me.id = ms."mainEventId";

-- Difensivo: non dovrebbe succedere dato che eventId era di fatto obbligatorio lato API.
DELETE FROM "main_event_slots" WHERE "eventId" IS NULL;

ALTER TABLE "main_event_slots" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "main_event_slots" ADD CONSTRAINT "main_event_slots_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "main_event_slots_eventId_idx" ON "main_event_slots"("eventId");

-- Un tavolo può ora essere libero (non assegnato a nessun main event).
ALTER TABLE "main_event_slots" DROP CONSTRAINT "main_event_slots_mainEventId_fkey";
ALTER TABLE "main_event_slots" ALTER COLUMN "mainEventId" DROP NOT NULL;
ALTER TABLE "main_event_slots" ADD CONSTRAINT "main_event_slots_mainEventId_fkey" FOREIGN KEY ("mainEventId") REFERENCES "main_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- main_events: non più legato a un singolo evento, diventa libreria riutilizzabile.
ALTER TABLE "main_events" DROP CONSTRAINT "main_events_eventId_fkey";
ALTER TABLE "main_events" DROP COLUMN "eventId";

-- main_event_reservations: nessuna prenotazione reale da preservare in produzione.
-- La prenotazione si lega ora a (mainEvent, event, day, slot) invece che a un tavolo preciso.
TRUNCATE TABLE "main_event_reservations";

ALTER TABLE "main_event_reservations" DROP CONSTRAINT "main_event_reservations_slotId_fkey";
DROP INDEX "main_event_reservations_slotId_status_holdExpiresAt_idx";
ALTER TABLE "main_event_reservations" DROP COLUMN "slotId";

ALTER TABLE "main_event_reservations" ADD COLUMN "mainEventId" TEXT NOT NULL;
ALTER TABLE "main_event_reservations" ADD COLUMN "eventId" TEXT NOT NULL;
ALTER TABLE "main_event_reservations" ADD COLUMN "day" TEXT NOT NULL;
ALTER TABLE "main_event_reservations" ADD COLUMN "slot" TEXT NOT NULL;

ALTER TABLE "main_event_reservations" ADD CONSTRAINT "main_event_reservations_mainEventId_fkey" FOREIGN KEY ("mainEventId") REFERENCES "main_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "main_event_reservations" ADD CONSTRAINT "main_event_reservations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "main_event_reservations_userId_mainEventId_eventId_day_slot_key" ON "main_event_reservations"("userId", "mainEventId", "eventId", "day", "slot");
CREATE INDEX "main_event_reservations_session_status_hold_idx" ON "main_event_reservations"("mainEventId", "eventId", "day", "slot", "status", "holdExpiresAt");
