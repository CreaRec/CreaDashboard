import { Bell, CheckCircle2, Circle } from 'lucide-react';
import type { Reminder } from '../../types';

interface RemindersListProps {
  reminders: Reminder[];
}

const priorityStyles: Record<Reminder['priority'], string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

const priorityLabels: Record<Reminder['priority'], string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export default function RemindersList({ reminders }: RemindersListProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Bell size={18} className="text-gray-500" />
        <h2 className="text-sm font-medium text-gray-700">Напоминания</h2>
      </div>

      <ul className="space-y-2">
        {reminders.map((reminder) => (
          <li
            key={reminder.id}
            className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
              reminder.completed ? 'opacity-50' : 'hover:bg-gray-50'
            }`}
          >
            {reminder.completed ? (
              <CheckCircle2 size={18} className="shrink-0 text-green-500" />
            ) : (
              <Circle size={18} className="shrink-0 text-gray-300" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm ${
                  reminder.completed
                    ? 'text-gray-400 line-through'
                    : 'text-gray-800'
                }`}
              >
                {reminder.title}
              </p>
              <p className="text-xs text-gray-400">
                до {formatDueDate(reminder.dueDate)}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[reminder.priority]}`}
            >
              {priorityLabels[reminder.priority]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
