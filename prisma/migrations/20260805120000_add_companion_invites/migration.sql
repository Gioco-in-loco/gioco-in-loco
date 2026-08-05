-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'INVITED';

-- DropForeignKey
ALTER TABLE "main_event_reservations" DROP CONSTRAINT "main_event_reservations_userId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_userId_fkey";

-- AlterTable
ALTER TABLE "main_event_reservations" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "invitedByUserId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "invitedByUserId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "main_event_reservations_inviteCode_key" ON "main_event_reservations"("inviteCode");

-- CreateIndex
CREATE INDEX "main_event_reservations_invitedByUserId_idx" ON "main_event_reservations"("invitedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_inviteCode_key" ON "reservations"("inviteCode");

-- CreateIndex
CREATE INDEX "reservations_invitedByUserId_idx" ON "reservations"("invitedByUserId");

-- AddForeignKey
ALTER TABLE "main_event_reservations" ADD CONSTRAINT "main_event_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_event_reservations" ADD CONSTRAINT "main_event_reservations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "main_event_reservations_session_status_hold_idx" RENAME TO "main_event_reservations_mainEventId_eventId_day_slot_status_idx";
