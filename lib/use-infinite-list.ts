"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type InfiniteListResult<T> = {
  /** First `count` rows of the source array (count grows in `pageSize` chunks). */
  visible: T[];
  /** Attach to a sentinel element placed below the visible rows. */
  sentinelRef: (node: HTMLDivElement | null) => void;
  /** True when more rows can still be revealed. */
  hasMore: boolean;
  /**
   * Ensure row `index` is rendered, bumping the visible count to the next
   * `pageSize` boundary that includes it.
   */
  bumpToInclude: (index: number) => void;
};

/**
 * Simple append-only infinite list. Renders `pageSize` rows by default and
 * grows by `pageSize` every time `sentinelRef` enters the viewport (with a
 * 200px rootMargin so the next chunk is ready before the user hits the
 * bottom). `bumpToInclude` is for scroll-to-focus flows where a specific row
 * outside the current window must be made visible.
 */
export function useInfiniteList<T>(
  rows: readonly T[],
  pageSize = 10,
): InfiniteListResult<T> {
  const [count, setCount] = useState(pageSize);
  const sentinelNodeRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const rowsLengthRef = useRef(rows.length);

  rowsLengthRef.current = rows.length;

  useEffect(() => {
    setCount((c) => Math.min(Math.max(c, pageSize), Math.max(rows.length, pageSize)));
  }, [rows, pageSize]);

  const observe = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      sentinelNodeRef.current = node;
      if (!node) return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setCount((c) => {
              const total = rowsLengthRef.current;
              if (c >= total) return c;
              return Math.min(c + pageSize, total);
            });
          }
        },
        { rootMargin: "200px" },
      );
      io.observe(node);
      observerRef.current = io;
    },
    [pageSize],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  const bumpToInclude = useCallback(
    (index: number) => {
      if (index < 0) return;
      setCount((c) => {
        const minNeeded = Math.ceil((index + 1) / pageSize) * pageSize;
        if (minNeeded <= c) return c;
        return Math.min(minNeeded, Math.max(rowsLengthRef.current, pageSize));
      });
    },
    [pageSize],
  );

  return {
    visible: rows.slice(0, count) as T[],
    sentinelRef: observe,
    hasMore: count < rows.length,
    bumpToInclude,
  };
}
