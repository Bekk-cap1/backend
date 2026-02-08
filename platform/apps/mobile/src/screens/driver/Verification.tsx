import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function DriverVerificationScreen() {
  const { show } = useToast();
  const query = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);

  return (
    <Screen>
      <Topbar title="Verification" />
      <Card>
        <Text style={{ fontWeight: '700' }}>Current status: {query.data?.status ?? 'unknown'}</Text>
        <Text>Verified at: {query.data?.verifiedAt ?? 'n/a'}</Text>
        <Button
          title="Submit for verification"
          onPress={async () => {
            try {
              await api.drivers.submitVerification();
              show({ title: 'Submitted', tone: 'success' });
              await query.reload();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>
    </Screen>
  );
}
