import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Badge } from '../../ui/components/Badge';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { sendOfferWithQueue } from '../../api/critical-actions';

const FINAL_STATUSES = new Set(['accepted', 'rejected', 'canceled', 'expired']);

type TimelineOffer = {
  id: string;
  price: number;
  seats: number;
  status: string;
  side: 'passenger' | 'driver';
  optimistic?: boolean;
};

function normalizeOffers(raw: any[]): TimelineOffer[] {
  return raw.map((item, idx) => ({
    id: String(item.id ?? `offer-${idx}`),
    price: Number(item.price ?? 0),
    seats: Number(item.seats ?? 1),
    status: String(item.status ?? 'pending').toLowerCase(),
    side:
      String(item.proposerRole ?? item.senderRole ?? item.side ?? 'passenger').toLowerCase() === 'driver'
        ? 'driver'
        : 'passenger',
  }));
}

function normalizeTurn(raw: any): 'passenger' | 'driver' | null {
  const turn = String(raw?.turn ?? raw?.nextTurn ?? '').toLowerCase();
  if (turn === 'passenger') return 'passenger';
  if (turn === 'driver') return 'driver';
  return null;
}

export function DriverNegotiationScreen({ route }: { route: any }) {
  const requestId = String(route.params?.requestId ?? '');
  const { show } = useToast();

  const [price, setPrice] = useState('47000');
  const [offers, setOffers] = useState<TimelineOffer[]>([]);
  const [turn, setTurn] = useState<'passenger' | 'driver' | null>(null);
  const [status, setStatus] = useState('pending');
  const [busy, setBusy] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncNegotiation = async () => {
    const [offersResponse, negotiationResponse] = await Promise.all([
      api.requests.offers(requestId),
      api.requests.negotiation(requestId),
    ]);

    const negotiation = unwrapPayload<any>(negotiationResponse);
    const nextStatus = String(negotiation?.status ?? negotiation?.state ?? 'pending').toLowerCase();

    setOffers(normalizeOffers(unwrapItems<any>(offersResponse)));
    setTurn(normalizeTurn(negotiation));
    setStatus(nextStatus);

    if (FINAL_STATUSES.has(nextStatus) && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    syncNegotiation().catch(() => undefined);

    pollingRef.current = setInterval(() => {
      syncNegotiation().catch(() => undefined);
    }, 2500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [requestId]);

  const canAct = useMemo(() => {
    if (FINAL_STATUSES.has(status)) return false;
    if (!turn) return true;
    return turn === 'driver';
  }, [status, turn]);

  const sendOffer = async () => {
    if (busy || !canAct) return;
    setBusy(true);

    const nextPrice = Math.max(1, Number(price));

    setOffers((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        price: nextPrice,
        seats: 1,
        side: 'driver',
        status: 'pending',
        optimistic: true,
      },
    ]);

    try {
      const result = await sendOfferWithQueue({
        requestId,
        price: nextPrice,
        seats: 1,
        currency: 'UZS',
      });

      if (result.queued) {
        show({ title: 'Offline: offer queued.', tone: 'info' });
      }

      await syncNegotiation();
    } catch (error) {
      setOffers((prev) => prev.filter((item) => !item.optimistic));
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Topbar title="Driver negotiation" right={<Badge label={status} />} />
      <Card>
        <Text>{turn ? (turn === 'driver' ? 'Your turn' : 'Waiting for passenger') : 'Syncing turn...'}</Text>
        <Input label="Counter-offer" value={price} onChangeText={setPrice} keyboardType="number-pad" />
        <Button title="Send counter-offer" loading={busy} onPress={sendOffer} disabled={!canAct || busy} />
      </Card>

      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ fontWeight: '700' }}>{item.side === 'driver' ? 'You' : 'Passenger'}</Text>
            <Text>Price: {item.price}</Text>
            <Badge label={item.optimistic ? 'queued' : item.status} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Accept" onPress={() => api.offers.accept(item.id).then(() => syncNegotiation())} />
              <Button title="Reject" variant="secondary" onPress={() => api.offers.reject(item.id).then(() => syncNegotiation())} />
              <Button title="Cancel" variant="destructive" onPress={() => api.offers.cancel(item.id).then(() => syncNegotiation())} />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
