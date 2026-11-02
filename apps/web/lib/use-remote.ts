'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useRemote<T>(path: string | null, poll = false) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let active = true;
    let controller: AbortController | undefined;
    setLoading(true);
    setData(null);
    async function load() {
      controller?.abort();
      controller = new AbortController();
      try {
        const result = await api<T>(path!, { signal: controller.signal });
        if (active) {
          setData(result);
          setError('');
        }
      } catch (e) {
        if (active && !(e instanceof DOMException && e.name === 'AbortError'))
          setError(e instanceof Error ? e.message : 'Unable to load');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const visible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const interval = poll ? setInterval(visible, 15000) : undefined;
    window.addEventListener('focus', visible);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener('focus', visible);
    };
  }, [path, poll, revision]);
  return { data, error, loading, refresh };
}
