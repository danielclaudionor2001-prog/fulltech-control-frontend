import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';

const getColumnsCount = (width) => {
  if (width >= 1080) {
    return 3;
  }

  if (width >= 680) {
    return 2;
  }

  return 1;
};

export default function ServiceOrderSlider({ items, renderItem }) {
  const containerRef = useRef(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [columnsCount, setColumnsCount] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const syncColumns = () => {
      setColumnsCount(getColumnsCount(container.clientWidth));
    };

    syncColumns();

    const resizeObserver = new ResizeObserver(syncColumns);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const pages = useMemo(() => {
    const nextPages = [];

    for (let index = 0; index < items.length; index += columnsCount) {
      nextPages.push(items.slice(index, index + columnsCount));
    }

    return nextPages;
  }, [columnsCount, items]);

  if (items.length === 0) {
    return null;
  }

  const maxPageIndex = Math.max(0, pages.length - 1);
  const activePageIndex = Math.min(pageIndex, maxPageIndex);
  const isMobileVertical = columnsCount === 1;
  const hasPreviousPage = activePageIndex > 0;
  const hasNextPage = activePageIndex < maxPageIndex;

  return (
    <div
      className={`order-slider ${isMobileVertical ? 'is-mobile-vertical' : ''}`.trim()}
      ref={containerRef}
    >
      <div className="order-slider-viewport">
        <div
          className="order-slider-track"
          style={{ transform: `translateX(-${activePageIndex * 100}%)` }}
        >
          {pages.map((pageItems, currentPageIndex) => (
            <div
              className="order-slider-page"
              key={`service-order-page-${currentPageIndex}`}
              style={{ '--order-slider-columns': columnsCount }}
            >
              {pageItems.map((item, itemIndex) =>
                renderItem(item, currentPageIndex * columnsCount + itemIndex),
              )}
            </div>
          ))}
        </div>
      </div>

      {hasPreviousPage ? (
        <button
          aria-label="Mostrar ordens anteriores"
          className={`order-slider-arrow ${
            isMobileVertical ? 'is-up' : 'is-left'
          }`.trim()}
          onClick={() =>
            setPageIndex((current) => Math.max(0, Math.min(current, maxPageIndex) - 1))
          }
          type="button"
        >
          {isMobileVertical ? <ChevronUp size={28} /> : <ChevronLeft size={30} />}
        </button>
      ) : null}

      {hasNextPage ? (
        <button
          aria-label="Mostrar próximas ordens"
          className={`order-slider-arrow ${
            isMobileVertical ? 'is-down' : 'is-right'
          }`.trim()}
          onClick={() =>
            setPageIndex((current) =>
              Math.min(maxPageIndex, Math.min(current, maxPageIndex) + 1),
            )
          }
          type="button"
        >
          {isMobileVertical ? <ChevronDown size={28} /> : <ChevronRight size={30} />}
        </button>
      ) : null}
    </div>
  );
}
