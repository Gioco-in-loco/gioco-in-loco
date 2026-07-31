ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users"
SET "isAdmin" = true,
    "role" = CASE WHEN "associationId" IS NOT NULL THEN 'RESPONSABILE'::"UserRole" ELSE 'USER'::"UserRole" END
WHERE "role" = 'ADMIN';
