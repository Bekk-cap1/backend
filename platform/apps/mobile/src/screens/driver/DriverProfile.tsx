import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Badge } from '../../ui/components/Badge';
import { useAuth } from '../../stores/auth/auth.context';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function DriverProfileScreen() {
  const { state, logout } = useAuth();
  const { show } = useToast();
  const profileQuery = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);
  const [note, setNote] = useState('Ready for rides');

  return (
    <Screen>
      <Topbar title="Driver profile" />
      <Card>
        <Text style={{ fontWeight: '700' }}>{state.user?.phone}</Text>
        <Badge label={String(profileQuery.data?.status ?? 'pending')} />
        <Input label="About" value={note} onChangeText={setNote} />
        <Button
          title="Save profile"
          onPress={async () => {
            try {
              await api.drivers.upsertProfile({ note });
              show({ title: 'Profile updated', tone: 'success' });
              await profileQuery.reload();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
        <Button title="Logout" variant="destructive" onPress={() => logout()} />
      </Card>
    </Screen>
  );
}
