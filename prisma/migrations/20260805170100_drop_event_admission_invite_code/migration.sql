-- DropIndex
DROP INDEX "event_admissions_inviteCode_key";

-- AlterTable
ALTER TABLE "event_admissions" DROP COLUMN "claimedAt",
DROP COLUMN "inviteCode";
