import { useCallback, useEffect, useState } from 'react';

/**
 * Run an async loader whenever `deps` change.
 * Returns the latest settled result; while a new request is in flight the
 * previous data stays available (`stale: true`) so lists don't flash empty.
 *   { data, error, loading, stale, reload }
 */
export function useAsync(loader, deps) {
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([deps, nonce]);
  const [result, setResult] = useState({ key: null, data: undefined, error: null });

  useEffect(() => {
    let active = true;
    loader().then(
      (data) => active && setResult({ key, data, error: null }),
      (error) => active && setResult((prev) => ({ key, data: prev.data, error })),
    );
    return () => {
      active = false;
    };
    // `key` captures deps + reload nonce; the loader closure is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const loading = result.key !== key;

  return {
    data: result.data,
    error: loading ? null : result.error,
    loading,
    stale: loading && result.data !== undefined,
    reload,
  };
}
