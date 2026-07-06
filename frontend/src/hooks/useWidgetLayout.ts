import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLayout, saveLayout } from '../api/layout';
import type { WidgetId } from '../types';

export function useWidgetLayout() {
  const [order, setOrder] = useState<WidgetId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orderRef = useRef<WidgetId[]>([]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    let cancelled = false;

    async function loadLayout() {
      try {
        const layout = await fetchLayout();
        if (!cancelled) {
          setOrder(layout.order);
          orderRef.current = layout.order;
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Не удалось загрузить расположение виджетов');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLayout();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDragEnd = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) {
        return;
      }

      const previousOrder = orderRef.current;
      const nextOrder = [...previousOrder];
      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);

      setOrder(nextOrder);
      orderRef.current = nextOrder;

      try {
        await saveLayout(nextOrder);
        setError(null);
      } catch {
        setOrder(previousOrder);
        orderRef.current = previousOrder;
        setError('Не удалось сохранить расположение виджетов');
      }
    },
    []
  );

  return {
    order,
    loading,
    error,
    handleDragEnd,
  };
}
