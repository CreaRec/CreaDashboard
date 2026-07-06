-- Add waterBills widget for WaterSmart billing amounts
-- Recreate enum (ADD VALUE + INSERT cannot run in the same transaction in PostgreSQL)

CREATE TYPE "WidgetId_new" AS ENUM (
  'electricityMonthly',
  'electricityIntervals',
  'electricityCurrent',
  'waterMonthly',
  'waterBills',
  'waterDaily',
  'gas',
  'calendar',
  'reminders',
  'notes'
);

ALTER TABLE "WidgetLayout" ALTER COLUMN "widgetId" TYPE "WidgetId_new" USING (
  "widgetId"::text::"WidgetId_new"
);

DROP TYPE "WidgetId";
ALTER TYPE "WidgetId_new" RENAME TO "WidgetId";

INSERT INTO "WidgetLayout" ("widgetId", "position", "visible", "updatedAt")
SELECT 'waterBills', COALESCE(MAX("position"), 0) + 1, true, CURRENT_TIMESTAMP
FROM "WidgetLayout"
ON CONFLICT ("widgetId") DO NOTHING;
