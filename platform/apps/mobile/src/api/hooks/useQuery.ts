import { useCallback, useEffect, useState } from 'react';
import { toErrorMessage } from '../../core/errors';

export function useQuery<T>(queryFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
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
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return { data, loading, error, reload };
}
