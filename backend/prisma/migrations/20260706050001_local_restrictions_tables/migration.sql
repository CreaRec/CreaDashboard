-- Local restrictions widget layout + snapshot tables

INSERT INTO "WidgetLayout" ("widgetId", "position", "visible", "updatedAt")
SELECT 'localRestrictions', COALESCE(MAX("position"), 0) + 1, true, CURRENT_TIMESTAMP
FROM "WidgetLayout"
ON CONFLICT ("widgetId") DO NOTHING;

CREATE TABLE "RestrictionsSnapshot" (
    "id" TEXT NOT NULL DEFAULT 'current',
    "burnBanActive" BOOLEAN NOT NULL,
    "burnBanCounty" TEXT NOT NULL,
    "waterStage" TEXT NOT NULL,
    "waterStageLabel" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestrictionsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RestrictionsSyncLog" (
    "id" TEXT NOT NULL,
    "status" "SmtSyncStatus" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "RestrictionsSyncLog_pkey" PRIMARY KEY ("id")
);
