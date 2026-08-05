-- main_events: non è legato a nessuna associazione specifica.
ALTER TABLE "main_events" DROP CONSTRAINT "main_events_associationId_fkey";
ALTER TABLE "main_events" DROP COLUMN "associationId";
