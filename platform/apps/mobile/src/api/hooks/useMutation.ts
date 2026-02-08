import { useState } from 'react';
import { toErrorMessage } from '../../core/errors';

export function useMutation<TArgs extends unknown[], TResult>(
  mutationFn: (...args: TArgs) => Promise<TResult>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (...args: TArgs) => {
    setLoading(true);
    setError(null);
    try {
      return await mutationFn(...args);
    } catch (err) {
      const message = toErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
