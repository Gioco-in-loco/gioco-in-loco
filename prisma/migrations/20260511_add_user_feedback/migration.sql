CREATE TYPE "UserFeedbackType" AS ENUM ('ADMIN_RESERVATION_CANCELLATION');

CREATE TABLE "user_feedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reservationId" TEXT,
  "authorUserId" TEXT,
  "type" "UserFeedbackType" NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_feedback_userId_createdAt_idx" ON "user_feedback"("userId", "createdAt");
CREATE INDEX "user_feedback_reservationId_idx" ON "user_feedback"("reservationId");
CREATE INDEX "user_feedback_authorUserId_idx" ON "user_feedback"("authorUserId");

ALTER TABLE "user_feedback"
ADD CONSTRAINT "user_feedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_feedback"
ADD CONSTRAINT "user_feedback_reservationId_fkey"
FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_feedback"
ADD CONSTRAINT "user_feedback_authorUserId_fkey"
FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
