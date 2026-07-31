'use client';

import { useCallback, useRef } from 'react';

// Serializes server-action calls: each enqueued fn runs only after the
// previous one settles, so rapid successive edits cannot race each other.
export function useActionQueue() {
  const tailRef = useRef<Promise<void>>(Promise.resolve());

  return useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const result = tailRef.current.then(fn);
    // Keep the chain alive even if an action rejects.
    tailRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);
}
