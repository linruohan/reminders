import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_ITEM_HEIGHT = 72;
const OVERSCAN = 6;
/** 低于此数量不做虚拟化，避免编辑态高度变化带来的跳动 */
const VIRTUALIZE_THRESHOLD = 40;

export function useVirtualList(itemCount: number, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const shouldVirtualize = enabled && itemCount >= VIRTUALIZE_THRESHOLD;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setViewportHeight(el.clientHeight);
    update();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);

    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      ro?.disconnect();
      el.removeEventListener('scroll', onScroll);
    };
  }, [shouldVirtualize]);

  const range = useMemo(() => {
    if (!shouldVirtualize || viewportHeight <= 0) {
      return { start: 0, end: itemCount, offsetY: 0, totalHeight: itemCount * DEFAULT_ITEM_HEIGHT };
    }
    const start = Math.max(0, Math.floor(scrollTop / DEFAULT_ITEM_HEIGHT) - OVERSCAN);
    const visible = Math.ceil(viewportHeight / DEFAULT_ITEM_HEIGHT) + OVERSCAN * 2;
    const end = Math.min(itemCount, start + visible);
    return {
      start,
      end,
      offsetY: start * DEFAULT_ITEM_HEIGHT,
      totalHeight: itemCount * DEFAULT_ITEM_HEIGHT,
    };
  }, [shouldVirtualize, scrollTop, viewportHeight, itemCount]);

  return {
    containerRef,
    shouldVirtualize,
    ...range,
  };
}
