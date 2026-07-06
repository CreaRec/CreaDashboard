-- Clear legacy calendar rows that lack CalDAV identifiers.
DELETE FROM "CalendarEvent";

-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "externalId" TEXT NOT NULL;
ALTER TABLE "CalendarEvent" ADD COLUMN "calendarUrl" TEXT NOT NULL;
ALTER TABLE "CalendarEvent" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_source_externalId_key" ON "CalendarEvent"("source", "externalId");
CREATE INDEX "CalendarEvent_source_start_idx" ON "CalendarEvent"("source", "start");

-- CreateTable
CREATE TABLE "CalendarSyncLog" (
    "id" TEXT NOT NULL,
    "status" "SmtSyncStatus" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CalendarSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSyncState" (
    "calendarUrl" TEXT NOT NULL,
    "syncToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSyncState_pkey" PRIMARY KEY ("calendarUrl")
);
