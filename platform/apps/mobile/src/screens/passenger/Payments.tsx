import { useEffect, useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Badge } from '../../ui/components/Badge';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { createPaymentIntentWithQueue } from '../../api/critical-actions';
import { appConfig } from '../../core/config';
import { extractRedirectUrl, isBookingPaid } from './payments.flow';

export function PaymentsScreen({ route }: { route: any }) {
  const bookingId = String(route.params?.bookingId ?? '');
  const tripId = String(route.params?.tripId ?? '');
  const { show } = useToast();

  const [provider, setProvider] = useState('stripe');
  const [latestPaymentId, setLatestPaymentId] = useState<string | null>(null);
  const [pendingExternal, setPendingExternal] = useState(false);

  const paymentsQuery = useQuery(async () => unwrapItems<any>(await api.payments.my()), [bookingId]);
  const bookingQuery = useQuery(async () => unwrapPayload<any>(await api.bookings.getById(bookingId)), [bookingId]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', () => {
      paymentsQuery.reload().catch(() => undefined);
      bookingQuery.reload().catch(() => undefined);
    });

    return () => {
      subscription.remove();
    };
  }, [bookingQuery, paymentsQuery]);

  useEffect(() => {
    if (!pendingExternal) return;

    const timer = setInterval(() => {
      paymentsQuery.reload().catch(() => undefined);
      bookingQuery.reload().catch(() => undefined);
    }, 4000);

    return () => clearInterval(timer);
  }, [bookingQuery, paymentsQuery, pendingExternal]);

  const paymentItems = useMemo(() => {
    if (!bookingId) return paymentsQuery.data ?? [];
    return (paymentsQuery.data ?? []).filter((item) => String(item.bookingId) === bookingId);
  }, [bookingId, paymentsQuery.data]);

  const isPaid = isBookingPaid(bookingQuery.data?.status);

  const beginPayment = async () => {
    try {
      const idempotencyKey = `mobile-${Date.now()}`;
      const intentResult = await createPaymentIntentWithQueue({
        bookingId,
        provider,
        idempotencyKey,
      });

      if (intentResult.queued) {
        show({ title: 'Offline: payment intent queued.', tone: 'info' });
        return;
      }

      const payload = unwrapPayload<any>(intentResult.result);
      const paymentId = String(payload?.payment?.id ?? '');
      if (paymentId) {
        setLatestPaymentId(paymentId);
      }

      const redirectUrl = extractRedirectUrl(payload);
      if (redirectUrl) {
        setPendingExternal(true);
        await WebBrowser.openBrowserAsync(redirectUrl);
        await paymentsQuery.reload();
        await bookingQuery.reload();
        return;
      }

      if (appConfig.enableMocks && paymentId) {
        await api.payments.markPaid(paymentId, { providerRef: 'mobile-mock' });
        await paymentsQuery.reload();
        await bookingQuery.reload();
        show({ title: 'Mock payment marked as paid', tone: 'success' });
        return;
      }

      setPendingExternal(true);
      show({ title: 'Intent created. Waiting for provider confirmation.', tone: 'info' });
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    }
  };

  return (
    <Screen>
      <Topbar title="Payments" />

      <Card>
        <Text>Booking: {bookingId || 'n/a'}</Text>
        <Text>Status: {String(bookingQuery.data?.status ?? 'unknown')}</Text>
        <Input label="Provider" value={provider} onChangeText={setProvider} placeholder="stripe/payme/click" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Create quote"
            variant="secondary"
            onPress={async () => {
              try {
                const quote = unwrapPayload<any>(await api.payments.quote({ tripId, seats: 1 }));
                show({ title: `Quote amount: ${quote.amount ?? quote.total ?? 0}`, tone: 'info' });
              } catch (error) {
                show({ title: toErrorMessage(error), tone: 'danger' });
              }
            }}
          />
          <Button title="Pay now" onPress={beginPayment} disabled={isPaid} />
        </View>

        {pendingExternal ? <Badge label="awaiting_provider" /> : null}
      </Card>

      {paymentItems.map((payment) => (
        <Card key={String(payment.id)}>
          <Text style={{ fontWeight: '700' }}>Payment #{String(payment.id).slice(0, 8)}</Text>
          <Text>Amount: {payment.amount ?? 0}</Text>
          <Badge label={String(payment.status ?? 'unknown')} />
          {appConfig.enableMocks ? (
            <Button
              title="Mark paid (mock)"
              onPress={async () => {
                try {
                  await api.payments.markPaid(String(payment.id));
                  await paymentsQuery.reload();
                  await bookingQuery.reload();
                  show({ title: 'Marked as paid', tone: 'success' });
                } catch (error) {
                  show({ title: toErrorMessage(error), tone: 'danger' });
                }
              }}
            />
          ) : null}
        </Card>
      ))}

      {latestPaymentId && !isPaid ? (
        <Card>
          <Text>Latest payment: {latestPaymentId.slice(0, 8)}</Text>
          <Button
            title="Refresh status"
            variant="secondary"
            onPress={async () => {
              await paymentsQuery.reload();
              await bookingQuery.reload();
              if (String(bookingQuery.data?.status ?? '').toLowerCase() === 'paid') {
                setPendingExternal(false);
              }
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
