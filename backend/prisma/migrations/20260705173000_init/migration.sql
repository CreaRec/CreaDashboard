-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WidgetId" AS ENUM ('electricity', 'water', 'gas', 'calendar', 'reminders', 'notes');

-- CreateEnum
CREATE TYPE "UtilityType" AS ENUM ('electricity', 'water', 'gas');

-- CreateTable
CREATE TABLE "WidgetLayout" (
    "widgetId" "WidgetId" NOT NULL,
    "position" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetLayout_pkey" PRIMARY KEY ("widgetId")
);

-- CreateTable
CREATE TABLE "UtilityReading" (
    "id" TEXT NOT NULL,
    "utilityType" "UtilityType" NOT NULL,
    "month" TEXT NOT NULL,
    "consumption" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UtilityReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "source" TEXT NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "priority" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "updatedAt" DATE NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetLayout_position_key" ON "WidgetLayout"("position");

-- CreateIndex
CREATE UNIQUE INDEX "UtilityReading_utilityType_month_key" ON "UtilityReading"("utilityType", "month");
