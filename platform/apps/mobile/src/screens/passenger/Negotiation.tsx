import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Badge } from '../../ui/components/Badge';
import { RequestStatusStrip } from '../../ui/components/RequestStatusStrip';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { sendOfferWithQueue } from '../../api/critical-actions';
import { formatMoney } from '../../core/format';

const FINAL_STATUSES = new Set(['accepted', 'rejected', 'canceled', 'expired']);

type TimelineOffer = {
  id: string;
  price: number;
  seats: number;
  status: string;
  side: 'passenger' | 'driver';
  optimistic?: boolean;
};

function normalizeTurn(raw: any): 'passenger' | 'driver' | null {
  const turn = String(raw?.turn ?? raw?.nextTurn ?? '').toLowerCase();
  if (turn === 'passenger') return 'passenger';
  if (turn === 'driver') return 'driver';
  return null;
}

function normalizeStatus(raw: any): string {
  return String(raw?.status ?? raw?.state ?? 'pending').toLowerCase();
}

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

export function PassengerNegotiationScreen({ route, navigation }: { route: any; navigation: any }) {
  const requestId = String(route.params?.requestId ?? '');
  const { show } = useToast();

  const [price, setPrice] = useState('45000');
  const [offers, setOffers] = useState<TimelineOffer[]>([]);
  const [turn, setTurn] = useState<'passenger' | 'driver' | null>(null);
  const [status, setStatus] = useState('pending');
  const [movesLeftPassenger, setMovesLeftPassenger] = useState<number | null>(null);
  const [movesLeftDriver, setMovesLeftDriver] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncNegotiation = async () => {
    const [offersResponse, negotiationResponse] = await Promise.all([
      api.requests.offers(requestId),
      api.requests.negotiation(requestId),
    ]);

    const nextOffers = normalizeOffers(unwrapItems<any>(offersResponse));
    const negotiation = unwrapPayload<any>(negotiationResponse);
    const nextStatus = normalizeStatus(negotiation);

    setOffers(nextOffers);
    setTurn(normalizeTurn(negotiation));
    setStatus(nextStatus);
    setMovesLeftPassenger(
      Number.isFinite(Number(negotiation?.passengerMovesLeft))
        ? Number(negotiation.passengerMovesLeft)
        : null,
    );
    setMovesLeftDriver(
      Number.isFinite(Number(negotiation?.driverMovesLeft))
        ? Number(negotiation.driverMovesLeft)
        : null,
    );

    if (FINAL_STATUSES.has(nextStatus) && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const resolveBookingFromRequest = async () => {
    const requestsResponse = await api.requests.listMine();
    const requests = unwrapItems<any>(requestsResponse);
    const current = requests.find((item) => String(item.id) === requestId);
    const bookingId = String(current?.booking?.id ?? '');
    const tripId = String(current?.tripId ?? current?.trip?.id ?? '');
    if (bookingId) {
      navigation.replace('BookingDetails', { bookingId, tripId });
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
    return turn === 'passenger';
  }, [status, turn]);

  const pushOptimisticOffer = (nextPrice: number) => {
    const temp: TimelineOffer = {
      id: `temp-${Date.now()}`,
      price: nextPrice,
      seats: 1,
      side: 'passenger',
      status: 'pending',
      optimistic: true,
    };
    setOffers((prev) => [...prev, temp]);
  };

  const sendOffer = async (deltaPercent?: number) => {
    if (busy) return;

    if (!canAct) {
      show({ title: 'Сейчас ход другой стороны', tone: 'info' });
      return;
    }

    setBusy(true);
    const nextPrice = deltaPercent
      ? Math.max(1, Math.round((Number(price) * (100 + deltaPercent)) / 100))
      : Number(price);

    setPrice(String(nextPrice));
    pushOptimisticOffer(nextPrice);

    try {
      const result = await sendOfferWithQueue({
        requestId,
        price: nextPrice,
        seats: 1,
        currency: 'UZS',
      });

      if (result.queued) {
        show({ title: 'Нет сети: оффер поставлен в очередь.', tone: 'info' });
      }

      await syncNegotiation();
    } catch (error) {
      setOffers((prev) => prev.filter((item) => !item.optimistic));
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const latestOffer = offers[offers.length - 1];

  return (
    <Screen>
      <Topbar title="Торг" right={<Badge label={status} />} />

      <Card>
        <Text style={{ fontWeight: '700' }}>Переговоры по цене</Text>
        <RequestStatusStrip
          status={status}
          nextTurn={turn}
          movesLeftPassenger={movesLeftPassenger}
          movesLeftDriver={movesLeftDriver}
        />
        <Text>
          {turn
            ? turn === 'passenger'
              ? 'Ваш ход'
              : 'Ожидаем ход водителя'
            : 'Синхронизируем состояние...'}
        </Text>
      </Card>

      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ fontWeight: '700' }}>{item.side === 'passenger' ? 'Вы' : 'Водитель'}</Text>
            <Text>Цена: {formatMoney(item.price, 'UZS')}</Text>
            <Badge label={item.optimistic ? 'в очереди' : item.status} />
          </Card>
        )}
        ListEmptyComponent={<Card><Text>Офферов пока нет.</Text></Card>}
      />

      <Card>
        <Input label="Ваш оффер" value={price} onChangeText={setPrice} keyboardType="number-pad" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="-5%" variant="secondary" onPress={() => sendOffer(-5)} disabled={!canAct || busy} />
          <Button title="+5%" variant="secondary" onPress={() => sendOffer(5)} disabled={!canAct || busy} />
        </View>
        <Button title="Отправить оффер" loading={busy} onPress={() => sendOffer()} disabled={!canAct || busy} />

        <Button
          title="Принять текущий"
          onPress={async () => {
            if (busy || !latestOffer) return;
            setBusy(true);
            try {
              await api.offers.accept(latestOffer.id);
              await syncNegotiation();
              show({ title: 'Оффер принят', tone: 'success' });
              await resolveBookingFromRequest();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            } finally {
              setBusy(false);
            }
          }}
        />

        <Button
          title="Отменить заявку"
          variant="destructive"
          onPress={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await api.requests.cancelRequest(requestId);
              setStatus('canceled');
              show({ title: 'Заявка отменена', tone: 'success' });
              navigation.goBack();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>
    </Screen>
  );
}
