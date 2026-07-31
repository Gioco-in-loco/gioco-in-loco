-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'RESPONSABILE', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "GdprAction" AS ENUM ('CONSENT_GIVEN', 'CONSENT_WITHDRAWN', 'DATA_EXPORTED', 'DATA_DELETION_REQUESTED', 'DATA_DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "associationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associations" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "bio" TEXT,
    "address" TEXT,
    "city" TEXT,
    "openingHours" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "website" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "tiktok" TEXT,
    "linktree" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "associations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_games" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "players" TEXT,
    "time" TEXT,
    "category" TEXT,
    "complexity" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_board_games" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "boardGameId" TEXT NOT NULL,
    "associationId" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_board_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_one_shots" (
    "eventId" TEXT NOT NULL,
    "oneShotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_one_shots_pkey" PRIMARY KEY ("eventId","oneShotId")
);

-- CreateTable
CREATE TABLE "main_events" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "game" TEXT,
    "associationId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_event_slots" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "table" TEXT,
    "maxPlayers" INTEGER NOT NULL DEFAULT 6,
    "mainEventId" TEXT NOT NULL,

    CONSTRAINT "main_event_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_event_reservations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "playerName" TEXT,
    "playerEmail" TEXT,
    "notes" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "main_event_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_shots" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "master" TEXT NOT NULL,
    "description" TEXT,
    "associationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "one_shots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_shot_slots" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 6,
    "oneshotId" TEXT NOT NULL,

    CONSTRAINT "one_shot_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "playerName" TEXT,
    "playerEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdpr_audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "GdprAction" NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gdpr_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseUserId_key" ON "users"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "associations_externalId_key" ON "associations"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "board_games_externalId_key" ON "board_games"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "events_externalId_key" ON "events"("externalId");

-- CreateIndex
CREATE INDEX "event_board_games_eventId_idx" ON "event_board_games"("eventId");

-- CreateIndex
CREATE INDEX "event_board_games_boardGameId_idx" ON "event_board_games"("boardGameId");

-- CreateIndex
CREATE INDEX "event_board_games_associationId_idx" ON "event_board_games"("associationId");

-- CreateIndex
CREATE UNIQUE INDEX "event_board_games_eventId_boardGameId_associationId_key" ON "event_board_games"("eventId", "boardGameId", "associationId");

-- CreateIndex
CREATE INDEX "event_one_shots_oneShotId_idx" ON "event_one_shots"("oneShotId");

-- CreateIndex
CREATE UNIQUE INDEX "main_events_externalId_key" ON "main_events"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "main_event_reservations_userId_slotId_key" ON "main_event_reservations"("userId", "slotId");

-- CreateIndex
CREATE UNIQUE INDEX "one_shots_externalId_key" ON "one_shots"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_userId_slotId_key" ON "reservations"("userId", "slotId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_games" ADD CONSTRAINT "board_games_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_games" ADD CONSTRAINT "event_board_games_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_games" ADD CONSTRAINT "event_board_games_boardGameId_fkey" FOREIGN KEY ("boardGameId") REFERENCES "board_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_board_games" ADD CONSTRAINT "event_board_games_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_one_shots" ADD CONSTRAINT "event_one_shots_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_one_shots" ADD CONSTRAINT "event_one_shots_oneShotId_fkey" FOREIGN KEY ("oneShotId") REFERENCES "one_shots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_events" ADD CONSTRAINT "main_events_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_events" ADD CONSTRAINT "main_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_event_slots" ADD CONSTRAINT "main_event_slots_mainEventId_fkey" FOREIGN KEY ("mainEventId") REFERENCES "main_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_event_reservations" ADD CONSTRAINT "main_event_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_event_reservations" ADD CONSTRAINT "main_event_reservations_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "main_event_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_shots" ADD CONSTRAINT "one_shots_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_shot_slots" ADD CONSTRAINT "one_shot_slots_oneshotId_fkey" FOREIGN KEY ("oneshotId") REFERENCES "one_shots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "one_shot_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
