"use client";

// Small client-side fetch hook with loading / error states.
// All screens consume the /api routes through this hook.

import { useEffect, useState } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const INITIAL = { data: null, loading: true, error: null };

export function useApi<T>(path: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T> & { key: string }>({
    key: path,
    ...INITIAL,
  });

  // Reset to loading when the requested path changes (state-during-render
  // adjustment, per React guidance, instead of a cascading effect).
  if (state.key !== path) {
    setState({ key: path, ...INITIAL });
  }

  useEffect(() => {
    let cancelled = false;

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelled)
          setState({ key: path, data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            key: path,
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Unexpected error",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state.key === path ? state : { ...INITIAL };
}
