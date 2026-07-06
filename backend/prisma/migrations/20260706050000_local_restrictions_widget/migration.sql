-- Add localRestrictions widget enum value (must be committed before use)

ALTER TYPE "WidgetId" ADD VALUE IF NOT EXISTS 'localRestrictions';
