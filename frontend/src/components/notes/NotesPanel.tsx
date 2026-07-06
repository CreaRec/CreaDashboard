import { StickyNote } from 'lucide-react';
import type { Note } from '../../types';

interface NotesPanelProps {
  notes: Note[];
}

const colorStyles: Record<Note['color'], string> = {
  yellow: 'bg-yellow-50 border-yellow-200',
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  pink: 'bg-pink-50 border-pink-200',
};

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NotesPanel({ notes }: NotesPanelProps) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <StickyNote size={18} className="text-gray-500" />
        <h2 className="text-sm font-medium text-gray-700">Заметки</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`rounded-lg border p-3 ${colorStyles[note.color]}`}
          >
            <p className="mb-1 text-sm font-medium text-gray-800">
              {note.title}
            </p>
            <p className="mb-2 text-sm leading-relaxed text-gray-600">
              {note.content}
            </p>
            <p className="text-xs text-gray-400">
              {formatUpdatedAt(note.updatedAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
