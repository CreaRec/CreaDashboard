-- DropIndex
DROP INDEX "UtilityReading_utilityType_month_key";

-- Legacy month labels (Apr, Jan, etc.) cannot be converted without a year.
DELETE FROM "UtilityReading" WHERE "month" !~ '^\d{4}-\d{2}$';

-- AlterTable
ALTER TABLE "UtilityReading"
  ALTER COLUMN "month" TYPE DATE
  USING (("month" || '-01')::date);

-- CreateIndex
CREATE UNIQUE INDEX "UtilityReading_utilityType_month_key" ON "UtilityReading"("utilityType", "month");
