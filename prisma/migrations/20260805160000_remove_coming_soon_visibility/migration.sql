-- Remove COMING_SOON from EventVisibility; existing rows with that value fall back to PREVIEW.
ALTER TYPE "EventVisibility" RENAME TO "EventVisibility_old";
CREATE TYPE "EventVisibility" AS ENUM ('PREVIEW', 'REVEALED');
ALTER TABLE "events" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "events" ALTER COLUMN "visibility" TYPE "EventVisibility" USING (
  CASE WHEN "visibility"::text = 'COMING_SOON' THEN 'PREVIEW' ELSE "visibility"::text END
)::"EventVisibility";
ALTER TABLE "events" ALTER COLUMN "visibility" SET DEFAULT 'REVEALED';
DROP TYPE "EventVisibility_old";
