import { useEffect, useState } from 'react';

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-surface-border bg-surface px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">CreaDashboard</h1>
        <p className="text-sm text-gray-500">Домашний dashboard</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium capitalize text-gray-700">
          {formatDateTime(now)}
        </p>
        <p className="text-2xl font-light tabular-nums text-gray-900">
          {formatTime(now)}
        </p>
      </div>
    </header>
  );
}
