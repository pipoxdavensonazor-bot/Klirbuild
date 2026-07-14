-- Visio Daily + live streaming + feed posts
CREATE TABLE IF NOT EXISTS "Meeting" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'company',
  "slug" TEXT NOT NULL,
  "dailyRoomName" TEXT NOT NULL,
  "dailyRoomUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "hostUserId" TEXT,
  "hostName" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "allowedRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "clientIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "shareToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Meeting_shareToken_key" ON "Meeting"("shareToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Meeting_companyId_slug_key" ON "Meeting"("companyId", "slug");
CREATE INDEX IF NOT EXISTS "Meeting_companyId_createdAt_idx" ON "Meeting"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "Meeting_companyId_audience_idx" ON "Meeting"("companyId", "audience");
CREATE INDEX IF NOT EXISTS "Meeting_slug_idx" ON "Meeting"("slug");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_companyId_fkey') THEN
    ALTER TABLE "Meeting"
      ADD CONSTRAINT "Meeting_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LiveSession" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "meetingId" TEXT,
  "title" TEXT,
  "dailyRoomName" TEXT NOT NULL,
  "dailyRoomUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "audience" TEXT NOT NULL DEFAULT 'company',
  "slug" TEXT NOT NULL,
  "shareToken" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "recordingUrl" TEXT,
  "clientIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LiveSession_shareToken_key" ON "LiveSession"("shareToken");
CREATE UNIQUE INDEX IF NOT EXISTS "LiveSession_companyId_slug_key" ON "LiveSession"("companyId", "slug");
CREATE INDEX IF NOT EXISTS "LiveSession_companyId_status_idx" ON "LiveSession"("companyId", "status");
CREATE INDEX IF NOT EXISTS "LiveSession_slug_idx" ON "LiveSession"("slug");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSession_companyId_fkey') THEN
    ALTER TABLE "LiveSession"
      ADD CONSTRAINT "LiveSession_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveSession_meetingId_fkey') THEN
    ALTER TABLE "LiveSession"
      ADD CONSTRAINT "LiveSession_meetingId_fkey"
      FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FeedPost" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "authorId" TEXT,
  "authorName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'company',
  "liveSessionId" TEXT,
  "recordingUrl" TEXT,
  "visibilityRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "clientIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FeedPost_companyId_createdAt_idx" ON "FeedPost"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedPost_companyId_audience_idx" ON "FeedPost"("companyId", "audience");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeedPost_companyId_fkey') THEN
    ALTER TABLE "FeedPost"
      ADD CONSTRAINT "FeedPost_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeedPost_liveSessionId_fkey') THEN
    ALTER TABLE "FeedPost"
      ADD CONSTRAINT "FeedPost_liveSessionId_fkey"
      FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
