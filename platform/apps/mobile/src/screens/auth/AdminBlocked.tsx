import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useAuth } from '../../stores/auth/auth.context';

export function AdminBlockedScreen() {
  const { logout } = useAuth();

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Режим админ-панели</Text>
        <Text>Аккаунты admin/moderator/ops/support работают только в веб-админке.</Text>
        <Button title="Выйти" variant="destructive" onPress={() => logout()} />
      </Card>
    </Screen>
  );
}
