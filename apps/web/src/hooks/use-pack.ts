'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { Pack, PackItem } from '@/types';

const STORAGE_KEY = 'coloring-pack';

// ─── Module-level store ───────────────────────────────────────────────────────
// Rules for useSyncExternalStore:
//   1. getSnapshot() MUST return the same reference if data hasn't changed.
//   2. subscribe() MUST NOT mutate the snapshot – doing so causes infinite loops.
//   3. Mutations go through writePack() which updates the cache then notifies.

const EMPTY_PACK: Pack = { items: [] };
let _cache: Pack = EMPTY_PACK;
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((l) => l());
}

function _readStorage(): Pack {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PACK;
    const parsed = JSON.parse(raw) as Pack;
    return parsed;
  } catch {
    return EMPTY_PACK;
  }
}

function writePack(next: Pack) {
  _cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded / private mode – ignore
  }
  _notify();
}

// ─── useSyncExternalStore callbacks ──────────────────────────────────────────

// subscribe: ONLY adds/removes listeners and cross-tab storage events.
// Must NOT mutate _cache.
function subscribe(listener: () => void): () => void {
  _listeners.add(listener);

  function onStorage(e: StorageEvent) {
    if (e.key !== STORAGE_KEY) return;
    try {
      _cache = e.newValue ? (JSON.parse(e.newValue) as Pack) : EMPTY_PACK;
    } catch {
      _cache = EMPTY_PACK;
    }
    _notify();
  }

  window.addEventListener('storage', onStorage);

  return () => {
    _listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

// getSnapshot: returns the current stable reference.
function getSnapshot(): Pack {
  return _cache;
}

// getServerSnapshot: SSR always returns empty pack.
function getServerSnapshot(): Pack {
  return EMPTY_PACK;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePack() {
  const pack = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Hydrate from localStorage once on mount (client only).
  // We do this in useEffect so it runs AFTER the first render,
  // avoiding any snapshot mutation during the subscribe/render cycle.
  useEffect(() => {
    const stored = _readStorage();
    // Only update if the stored value differs from the current cache
    if (stored !== _cache) {
      _cache = stored;
      _notify();
    }
  }, []);

  const addItem = useCallback((item: PackItem) => {
    if (_cache.items.some((i) => i.coloringId === item.coloringId)) return;
    writePack({ items: [..._cache.items, item] });
  }, []);

  const removeItem = useCallback((coloringId: string) => {
    writePack({ items: _cache.items.filter((i) => i.coloringId !== coloringId) });
  }, []);

  const clearPack = useCallback(() => {
    writePack(EMPTY_PACK);
  }, []);

  const isInPack = useCallback(
    (coloringId: string) => pack.items.some((i) => i.coloringId === coloringId),
    [pack.items],
  );

  const toggleItem = useCallback(
    (item: PackItem) => {
      if (isInPack(item.coloringId)) {
        removeItem(item.coloringId);
      } else {
        addItem(item);
      }
    },
    [isInPack, addItem, removeItem],
  );

  return {
    pack,
    addItem,
    removeItem,
    clearPack,
    isInPack,
    toggleItem,
    count: pack.items.length,
  };
}
