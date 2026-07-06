import { Calendar } from 'lucide-react';
import type { CalendarEvent } from '../../types';

interface CalendarWidgetProps {
  events: CalendarEvent[];
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

export default function CalendarWidget({ events }: CalendarWidgetProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = now.getDate();

  const monthLabel = now.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  const eventDays = new Set(
    events.map((e) => new Date(e.start).getDate())
  );

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const upcomingEvents = [...events]
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 4);

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-500" />
          <h2 className="text-sm font-medium capitalize text-gray-700">
            {monthLabel}
          </h2>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          Apple Calendar — скоро
        </span>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`flex h-7 items-center justify-center rounded-full text-xs ${
              day === null
                ? ''
                : day === today
                  ? 'bg-blue-500 font-semibold text-white'
                  : eventDays.has(day)
                    ? 'bg-blue-50 font-medium text-blue-600'
                    : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-surface-border pt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Ближайшие события
        </p>
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-2 rounded-lg bg-gray-50 px-2 py-1.5"
          >
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-800">{event.title}</p>
              <p className="text-xs text-gray-400">
                {formatEventDate(event.start)} · {formatEventTime(event.start)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
