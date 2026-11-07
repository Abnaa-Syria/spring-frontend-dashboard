import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Active tab kept in the URL (?tab=...) so other pages can link straight to it. */
export function useTabParam(fallback: string, key = 'tab') {
  const [params, setParams] = useSearchParams();
  const tab = params.get(key) ?? fallback;
  const setTab = useCallback(
    (v: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(key, v);
        next.delete('open');
        return next;
      }, { replace: true }),
    [key, setParams],
  );
  return [tab, setTab] as const;
}
