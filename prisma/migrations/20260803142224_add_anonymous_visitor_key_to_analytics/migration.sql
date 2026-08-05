ALTER TABLE "analytics_sessions"
ADD COLUMN "visitorKey" TEXT NOT NULL DEFAULT 'legacy';

CREATE INDEX "analytics_sessions_visitorKey_idx" ON "analytics_sessions"("visitorKey");