'use client';

import { createContext, useContext } from 'react';
import { usePack } from '@/hooks/use-pack';
import type { PackItem } from '@/types';

type PackContextValue = ReturnType<typeof usePack>;

const PackContext = createContext<PackContextValue | null>(null);

export function PackProvider({ children }: { children: React.ReactNode }) {
  const pack = usePack();
  return <PackContext.Provider value={pack}>{children}</PackContext.Provider>;
}

export function usePackContext(): PackContextValue {
  const ctx = useContext(PackContext);
  if (!ctx) {
    throw new Error('usePackContext must be used within a PackProvider');
  }
  return ctx;
}

// Re-export PackItem for convenience
export type { PackItem };
