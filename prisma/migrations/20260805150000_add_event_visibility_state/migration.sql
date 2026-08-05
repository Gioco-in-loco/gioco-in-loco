-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('COMING_SOON', 'PREVIEW', 'REVEALED');

-- AlterTable: add the new column first, backfill from the old boolean, then drop it.
ALTER TABLE "events" ADD COLUMN "visibility" "EventVisibility" NOT NULL DEFAULT 'REVEALED';

UPDATE "events" SET "visibility" = 'COMING_SOON' WHERE "showComingSoon" = true;

ALTER TABLE "events" DROP COLUMN "showComingSoon";
