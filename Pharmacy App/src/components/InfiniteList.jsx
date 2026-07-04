import { useEffect, useRef, useState } from 'react';

/**
 * Chunked rendering so 1,000+ rows never all hit the DOM at once — renders
 * `pageSize` items and grows via an IntersectionObserver sentinel as the
 * user scrolls, instead of true fixed-height virtualization (rows here are
 * expandable, so heights vary).
 */
export function InfiniteList({ items, pageSize = 40, renderItem }) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + pageSize, items.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, pageSize]);

  const visible = items.slice(0, visibleCount);

  return (
    <>
      {visible.map(renderItem)}
      {visibleCount < items.length && <div ref={sentinelRef} style={{ height: 1 }} />}
    </>
  );
}
