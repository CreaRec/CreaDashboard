import { ReactNode } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SortableWidget from './SortableWidget';
import type { WidgetId } from '../../types';

interface DashboardGridProps {
  order: WidgetId[];
  widgets: Record<WidgetId, ReactNode>;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
}

export default function DashboardGrid({
  order,
  widgets,
  onDragEnd,
}: DashboardGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = order.indexOf(active.id as WidgetId);
    const toIndex = order.indexOf(over.id as WidgetId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    onDragEnd(fromIndex, toIndex);
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {order.map((id) => (
              <SortableWidget key={id} id={id}>
                {widgets[id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
