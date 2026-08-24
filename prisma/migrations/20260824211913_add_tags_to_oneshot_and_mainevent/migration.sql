-- AlterTable
ALTER TABLE "main_events" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "one_shots" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
