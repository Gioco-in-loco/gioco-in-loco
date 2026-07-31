ALTER TABLE "one_shots"
ADD COLUMN "minPlayers" INTEGER,
ADD COLUMN "maxPlayers" INTEGER;

UPDATE "one_shots" AS os
SET
  "minPlayers" = limits."minPlayers",
  "maxPlayers" = limits."maxPlayers"
FROM (
  SELECT
    "oneshotId",
    MIN("maxPlayers") AS "minPlayers",
    MAX("maxPlayers") AS "maxPlayers"
  FROM "one_shot_slots"
  GROUP BY "oneshotId"
) AS limits
WHERE os."id" = limits."oneshotId";

UPDATE "one_shots"
SET
  "minPlayers" = COALESCE("minPlayers", 1),
  "maxPlayers" = COALESCE("maxPlayers", GREATEST(COALESCE("minPlayers", 1), 6));

ALTER TABLE "one_shots"
ALTER COLUMN "minPlayers" SET NOT NULL,
ALTER COLUMN "minPlayers" SET DEFAULT 1,
ALTER COLUMN "maxPlayers" SET NOT NULL,
ALTER COLUMN "maxPlayers" SET DEFAULT 6;