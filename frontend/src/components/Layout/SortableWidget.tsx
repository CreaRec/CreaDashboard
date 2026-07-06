import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { WidgetId } from '../../types';

interface SortableWidgetProps {
  id: WidgetId;
  children: ReactNode;
}

export default function SortableWidget({ id, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? 'z-10 opacity-50 ring-2 ring-blue-400 ring-offset-2' : ''}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="absolute right-2 top-2 z-10 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 focus:opacity-100 cursor-grab active:cursor-grabbing"
        aria-label="Перетащить виджет"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className="h-full">{children}</div>
    </div>
  );
}
