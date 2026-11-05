import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * The id of the record whose drawer is open, kept in the URL (?open=12) so links from
 * search, the home page and other pages land on the record directly.
 */
export function useOpenParam(key = 'open') {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const id = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  const setId = useCallback(
    (v: number | null) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (v == null) next.delete(key);
        else next.set(key, String(v));
        return next;
      }, { replace: v == null }),
    [key, setParams],
  );
  return [id, setId] as const;
}

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
