-- AlterTable
ALTER TABLE "event_admissions" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "invitedByUserId" TEXT,
ADD COLUMN     "playerEmail" TEXT,
ADD COLUMN     "playerName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "event_admissions_inviteCode_key" ON "event_admissions"("inviteCode");

-- CreateIndex
CREATE INDEX "event_admissions_invitedByUserId_idx" ON "event_admissions"("invitedByUserId");

-- AddForeignKey
ALTER TABLE "event_admissions" ADD CONSTRAINT "event_admissions_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
