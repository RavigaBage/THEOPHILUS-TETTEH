import { useMemo } from 'react';

interface FuzzyOptions {
  keys: string[];
}

export function useFuzzySearch<T>(items: T[], query: string, options: FuzzyOptions): T[] {
  return useMemo(() => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();

    return items.filter((item) => {
      return options.keys.some((key) => {
        const value = (item as any)[key];
        if (!value) return false;
        return String(value).toLowerCase().includes(lowerQuery);
      });
    });
  }, [items, query, options.keys]);
}
