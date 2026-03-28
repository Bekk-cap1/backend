import { useCallback, useEffect, useState } from 'react';
import { toErrorMessage } from '../../core/errors';

type UseQueryOptions = {
  enabled?: boolean;
};

export function useQuery<T>(queryFn: () => Promise<T>, deps: unknown[] = [], options?: UseQueryOptions) {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await queryFn();
      setData(next);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    reload().catch(() => undefined);
  }, [enabled, reload]);

  return { data, loading, error, reload };
}
