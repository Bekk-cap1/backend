import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { useAuth } from '../../stores/auth/auth.context';

export function PassengerProfileScreen() {
  const { state, logout } = useAuth();

  return (
    <Screen>
      <Topbar title="Profile" />
      <Card>
        <Text style={{ fontWeight: '700' }}>Role: {state.user?.role}</Text>
        <Text>Phone: {state.user?.phone}</Text>
        <Button title="Logout" variant="destructive" onPress={() => logout()} />
      </Card>
    </Screen>
  );
}
