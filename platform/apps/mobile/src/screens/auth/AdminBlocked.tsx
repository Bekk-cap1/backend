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
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Use Admin Web</Text>
        <Text>Admin, moderator and operations roles are available only in the web console.</Text>
        <Button title="Logout" variant="destructive" onPress={() => logout()} />
      </Card>
    </Screen>
  );
}
