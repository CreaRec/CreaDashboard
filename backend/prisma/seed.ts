import { PrismaClient, UtilityType, WidgetId } from '@prisma/client';
import {
  calendarMock,
  notesMock,
  remindersMock,
  utilitiesMock,
} from '../src/mocks/data';

const prisma = new PrismaClient();

const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  WidgetId.electricity,
  WidgetId.water,
  WidgetId.gas,
  WidgetId.calendar,
  WidgetId.reminders,
  WidgetId.notes,
];

async function seedWidgetLayout() {
  for (let position = 0; position < DEFAULT_WIDGET_ORDER.length; position++) {
    const widgetId = DEFAULT_WIDGET_ORDER[position];
    await prisma.widgetLayout.upsert({
      where: { widgetId },
      update: { position },
      create: { widgetId, position },
    });
  }
}

async function seedUtilityReadings() {
  for (const [type, data] of Object.entries(utilitiesMock)) {
    const utilityType = type as UtilityType;
    for (const reading of data.readings) {
      await prisma.utilityReading.upsert({
        where: {
          utilityType_month: {
            utilityType,
            month: reading.month,
          },
        },
        update: {
          consumption: reading.consumption,
          cost: reading.cost,
        },
        create: {
          utilityType,
          month: reading.month,
          consumption: reading.consumption,
          cost: reading.cost,
        },
      });
    }
  }
}

async function seedCalendarEvents() {
  for (const event of calendarMock) {
    await prisma.calendarEvent.upsert({
      where: { id: event.id },
      update: {
        title: event.title,
        start: new Date(event.start),
        end: event.end ? new Date(event.end) : null,
        source: event.source,
      },
      create: {
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: event.end ? new Date(event.end) : null,
        source: event.source,
      },
    });
  }
}

async function seedReminders() {
  for (const reminder of remindersMock) {
    await prisma.reminder.upsert({
      where: { id: reminder.id },
      update: {
        title: reminder.title,
        dueDate: new Date(reminder.dueDate),
        priority: reminder.priority,
        completed: reminder.completed,
      },
      create: {
        id: reminder.id,
        title: reminder.title,
        dueDate: new Date(reminder.dueDate),
        priority: reminder.priority,
        completed: reminder.completed,
      },
    });
  }
}

async function seedNotes() {
  for (const note of notesMock) {
    await prisma.note.upsert({
      where: { id: note.id },
      update: {
        title: note.title,
        content: note.content,
        color: note.color,
        updatedAt: new Date(note.updatedAt),
      },
      create: {
        id: note.id,
        title: note.title,
        content: note.content,
        color: note.color,
        updatedAt: new Date(note.updatedAt),
      },
    });
  }
}

async function main() {
  await seedWidgetLayout();
  await seedUtilityReadings();
  await seedCalendarEvents();
  await seedReminders();
  await seedNotes();
  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
