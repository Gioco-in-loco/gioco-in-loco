CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'CUSTOM');

CREATE TYPE "AnalyticsDeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'UNKNOWN');

CREATE TABLE "analytics_sessions" (
  "id" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "landingPath" TEXT,
  "lastPath" TEXT,
  "referrer" TEXT,
  "deviceType" "AnalyticsDeviceType" NOT NULL DEFAULT 'UNKNOWN',
  "browser" TEXT,
  "os" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_events" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" "AnalyticsEventType" NOT NULL DEFAULT 'PAGE_VIEW',
  "name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "pageTitle" TEXT,
  "eventData" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_sessions_sessionKey_key" ON "analytics_sessions"("sessionKey");
CREATE INDEX "analytics_sessions_startedAt_idx" ON "analytics_sessions"("startedAt");
CREATE INDEX "analytics_sessions_lastSeenAt_idx" ON "analytics_sessions"("lastSeenAt");

CREATE INDEX "analytics_events_sessionId_idx" ON "analytics_events"("sessionId");
CREATE INDEX "analytics_events_path_idx" ON "analytics_events"("path");
CREATE INDEX "analytics_events_type_occurredAt_idx" ON "analytics_events"("type", "occurredAt");
CREATE INDEX "analytics_events_name_occurredAt_idx" ON "analytics_events"("name", "occurredAt");

ALTER TABLE "analytics_events"
ADD CONSTRAINT "analytics_events_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "analytics_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;