-- Unifica one_shot_slots e main_event_slots in un unico pool "event_slots":
-- i tavoli si creano una volta per evento e possono essere assegnati a una
-- one-shot O a un main event (mai entrambi), invece di due pool paralleli e
-- strutturalmente identici.

ALTER TABLE "one_shot_slots" ADD COLUMN "mainEventId" TEXT;
ALTER TABLE "one_shot_slots" ADD CONSTRAINT "one_shot_slots_mainEventId_fkey" FOREIGN KEY ("mainEventId") REFERENCES "main_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migra i tavoli dei main event nel pool unificato (nessuna reservation
-- referenzia main_event_slots.id: le main_event_reservations si legano già a
-- mainEvent+event+day+slot, non a un tavolo preciso).
INSERT INTO "one_shot_slots" ("id", "day", "slot", "table", "maxPlayers", "adminOnly", "eventId", "oneshotId", "mainEventId")
SELECT "id", "day", "slot", COALESCE("table", ''), "maxPlayers", false, "eventId", NULL, "mainEventId"
FROM "main_event_slots";

ALTER TABLE "main_event_slots" DROP CONSTRAINT "main_event_slots_eventId_fkey";
ALTER TABLE "main_event_slots" DROP CONSTRAINT "main_event_slots_mainEventId_fkey";
DROP TABLE "main_event_slots";

-- Un tavolo non può essere assegnato contemporaneamente a una one-shot e a un main event.
ALTER TABLE "one_shot_slots" ADD CONSTRAINT "one_shot_slots_single_assignment_check" CHECK (NOT ("oneshotId" IS NOT NULL AND "mainEventId" IS NOT NULL));

-- Rinomina tabella/vincoli/indici per riflettere il nuovo ruolo condiviso.
ALTER TABLE "one_shot_slots" RENAME TO "event_slots";
ALTER TABLE "event_slots" RENAME CONSTRAINT "one_shot_slots_pkey" TO "event_slots_pkey";
ALTER TABLE "event_slots" RENAME CONSTRAINT "one_shot_slots_eventId_fkey" TO "event_slots_eventId_fkey";
ALTER TABLE "event_slots" RENAME CONSTRAINT "one_shot_slots_oneshotId_fkey" TO "event_slots_oneshotId_fkey";
ALTER TABLE "event_slots" RENAME CONSTRAINT "one_shot_slots_mainEventId_fkey" TO "event_slots_mainEventId_fkey";
ALTER TABLE "event_slots" RENAME CONSTRAINT "one_shot_slots_single_assignment_check" TO "event_slots_single_assignment_check";
ALTER INDEX "one_shot_slots_eventId_idx" RENAME TO "event_slots_eventId_idx";
