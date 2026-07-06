import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { CalendarEvent } from '../../types';
import {
  getEventDaysInMonth,
  getEventsForDay,
  getUpcomingEvents,
  isToday,
  shiftMonth,
} from './calendarUtils';

interface CalendarWidgetProps {
  events: CalendarEvent[];
}

interface SelectedDay {
  year: number;
  month: number;
  day: number;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

function formatSelectedDayLabel({ year, month, day }: SelectedDay): string {
  return new Date(year, month, day).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function EventListItem({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-2 py-1.5">
      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-800">{event.title}</p>
        <p className="text-xs text-gray-400">
          {formatEventDate(event.start)} · {formatEventTime(event.start)}
        </p>
      </div>
    </div>
  );
}

interface DayEventsModalProps {
  selectedDay: SelectedDay;
  events: CalendarEvent[];
  onClose: () => void;
}

function DayEventsModal({ selectedDay, events, onClose }: DayEventsModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-events-title"
        className="relative z-10 w-full max-w-sm rounded-xl border border-surface-border bg-surface p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              События
            </p>
            <h3
              id="day-events-title"
              className="text-sm font-medium capitalize text-gray-800"
            >
              {formatSelectedDayLabel(selectedDay)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        {events.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
            На этот день событий нет
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {events.map((event) => (
              <EventListItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarWidget({ events }: CalendarWidgetProps) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const { year, month } = viewDate;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const eventDays = getEventDaysInMonth(events, year, month);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const upcomingEvents = getUpcomingEvents(events, now);

  const selectedDayEvents = selectedDay
    ? getEventsForDay(events, selectedDay.year, selectedDay.month, selectedDay.day)
    : [];

  const changeMonth = (delta: number) => {
    setViewDate((current) => shiftMonth(current.year, current.month, delta));
    setSelectedDay(null);
  };

  return (
    <>
      <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Calendar size={18} className="shrink-0 text-gray-500" />
            <h2 className="truncate text-sm font-medium capitalize text-gray-700">
              {monthLabel}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Следующий месяц"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={i} className="h-7" />;
            }

            const dayIsToday = isToday(year, month, day, now);
            const hasEvents = eventDays.has(day);

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDay({ year, month, day })}
                className={`flex h-7 items-center justify-center rounded-full text-xs transition-colors ${
                  dayIsToday
                    ? 'bg-blue-500 font-semibold text-white hover:bg-blue-600'
                    : hasEvents
                      ? 'bg-blue-50 font-medium text-blue-600 hover:bg-blue-100'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-surface-border pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Ближайшие события
          </p>
          {upcomingEvents.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </div>
      </div>

      {selectedDay && (
        <DayEventsModal
          selectedDay={selectedDay}
          events={selectedDayEvents}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}
