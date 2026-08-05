-- AlterTable
ALTER TABLE "event_slots" ADD COLUMN     "bookingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "bookingOpensAt" TIMESTAMP(3),
ADD COLUMN     "showComingSoon" BOOLEAN NOT NULL DEFAULT false;
