import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLayout, saveLayout } from '../api/layout';
import type { WidgetId } from '../types';
import { WIDGET_LABELS } from '../types';

const ALL_WIDGET_IDS = Object.keys(WIDGET_LABELS) as WidgetId[];
const DEFAULT_VISIBILITY = {} as Record<WidgetId, boolean>;

function buildFullVisibility(
  visibility: Record<WidgetId, boolean>
): Record<WidgetId, boolean> {
  return Object.fromEntries(
    ALL_WIDGET_IDS.map((widgetId) => [
      widgetId,
      visibility[widgetId] !== false,
    ])
  ) as Record<WidgetId, boolean>;
}

function isLayoutLoaded(order: WidgetId[]): boolean {
  return order.length === ALL_WIDGET_IDS.length;
}

export function useWidgetLayout() {
  const [order, setOrder] = useState<WidgetId[]>([]);
  const [visibility, setVisibility] =
    useState<Record<WidgetId, boolean>>(DEFAULT_VISIBILITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orderRef = useRef<WidgetId[]>([]);
  const visibilityRef = useRef<Record<WidgetId, boolean>>(DEFAULT_VISIBILITY);
  const saveChainRef = useRef(Promise.resolve());

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    visibilityRef.current = visibility;
  }, [visibility]);

  useEffect(() => {
    let cancelled = false;

    async function loadLayout() {
      try {
        const layout = await fetchLayout();
        if (!cancelled) {
          setOrder(layout.order);
          setVisibility(layout.visibility);
          orderRef.current = layout.order;
          visibilityRef.current = layout.visibility;
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

  const persistLayout = useCallback(
    async (nextOrder: WidgetId[], nextVisibility: Record<WidgetId, boolean>) => {
      if (!isLayoutLoaded(nextOrder)) {
        throw new Error('Layout not loaded');
      }

      const fullVisibility = buildFullVisibility(nextVisibility);

      const runSave = async () => {
        await saveLayout(nextOrder, fullVisibility);
        setError(null);
      };

      saveChainRef.current = saveChainRef.current.then(runSave, runSave);
      await saveChainRef.current;
    },
    []
  );

  const handleDragEnd = useCallback(
    async (fromVisibleIndex: number, toVisibleIndex: number) => {
      if (fromVisibleIndex === toVisibleIndex) {
        return;
      }

      const visibleIds = orderRef.current.filter(
        (widgetId) => visibilityRef.current[widgetId] !== false
      );
      const fromId = visibleIds[fromVisibleIndex];
      const toId = visibleIds[toVisibleIndex];

      if (!fromId || !toId) {
        return;
      }

      const previousOrder = orderRef.current;
      const nextOrder = [...previousOrder];
      const fromIndex = nextOrder.indexOf(fromId);
      const toIndex = nextOrder.indexOf(toId);
      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);

      setOrder(nextOrder);
      orderRef.current = nextOrder;

      try {
        await persistLayout(nextOrder, visibilityRef.current);
      } catch {
        setOrder(previousOrder);
        orderRef.current = previousOrder;
        setError('Не удалось сохранить расположение виджетов');
      }
    },
    [persistLayout]
  );

  const handleVisibilityChange = useCallback(
    async (widgetId: WidgetId, visible: boolean) => {
      if (!isLayoutLoaded(orderRef.current)) {
        return;
      }

      const previousVisibility = visibilityRef.current;
      const nextVisibility = buildFullVisibility({
        ...previousVisibility,
        [widgetId]: visible,
      });

      setVisibility(nextVisibility);
      visibilityRef.current = nextVisibility;

      try {
        await persistLayout(orderRef.current, nextVisibility);
      } catch {
        setVisibility(previousVisibility);
        visibilityRef.current = previousVisibility;
        setError('Не удалось сохранить видимость виджетов');
      }
    },
    [persistLayout]
  );

  const visibleOrder = order.filter((widgetId) => visibility[widgetId] !== false);

  return {
    order,
    visibleOrder,
    visibility,
    loading,
    error,
    handleDragEnd,
    handleVisibilityChange,
  };
}
