import { useMutation } from './useMutation';
import { useQuery } from './useQuery';
import { api } from '../client';
import { unwrapItems } from '../mappers/dto';

export function usePayments() {
  const myPayments = useQuery(async () => unwrapItems<any>(await api.payments.my()), []);
  const myQuotes = useQuery(async () => unwrapItems<any>(await api.payments.myQuotes()), []);

  const quote = useMutation(async (payload: Record<string, unknown>) => api.payments.quote(payload));
  const createIntent = useMutation(async (payload: { bookingId: string; body: Record<string, unknown> }) =>
    api.payments.createIntent(payload.bookingId, payload.body),
  );

  return { myPayments, myQuotes, quote, createIntent };
}
