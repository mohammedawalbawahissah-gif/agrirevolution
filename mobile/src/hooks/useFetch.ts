import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Minimal GET-request hook, mirrors the web app's useFetch for consistency.
 * Refetches whenever `url` or any value in `deps` changes.
 */
export function useFetch<T>(url: string | null, deps: unknown[] = []): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ data: null, isLoading: !!url, error: null });
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    apiClient
      .get<T>(url)
      .then((res) => {
        if (!cancelled) setState({ data: res.data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ data: null, isLoading: false, error: err?.message || "Failed to load data" });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);

  return { ...state, refetch };
}
