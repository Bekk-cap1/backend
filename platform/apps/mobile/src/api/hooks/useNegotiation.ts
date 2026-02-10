import { useQuery } from './useQuery';
import { useMutation } from './useMutation';
import { api } from '../client';
import { unwrapItems, unwrapPayload } from '../mappers/dto';

export function useNegotiation(requestId: string) {
  const session = useQuery(async () => unwrapPayload<any>(await api.requests.negotiation(requestId)), [requestId]);
  const offers = useQuery(async () => unwrapItems<any>(await api.requests.offers(requestId)), [requestId]);

  const sendOffer = useMutation(async (payload: Record<string, unknown>) =>
    api.requests.createOffer(requestId, payload),
  );

  const acceptOffer = useMutation(async (offerId: string) => api.offers.accept(offerId));
  const rejectOffer = useMutation(async (offerId: string) => api.offers.reject(offerId));
  const cancelOffer = useMutation(async (offerId: string) => api.offers.cancel(offerId));

  return { session, offers, sendOffer, acceptOffer, rejectOffer, cancelOffer };
}
