-- DropIndex
DROP INDEX "main_event_reservations_inviteCode_key";

-- DropIndex
DROP INDEX "reservations_inviteCode_key";

-- AlterTable
ALTER TABLE "analytics_sessions" ALTER COLUMN "visitorKey" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "main_event_reservations_inviteCode_idx" ON "main_event_reservations"("inviteCode");

-- CreateIndex
CREATE INDEX "reservations_inviteCode_idx" ON "reservations"("inviteCode");
