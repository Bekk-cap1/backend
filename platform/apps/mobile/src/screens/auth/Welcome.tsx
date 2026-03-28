import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';

export function WelcomeScreen({ navigation }: { navigation: any }) {
  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 26, fontWeight: '700' }}>Intercity Pulse</Text>
        <Text style={{ opacity: 0.8 }}>
          Межгородние поездки с торгом, картой и прозрачными шагами от поиска до оплаты.
        </Text>
        <Button title="Начать" onPress={() => navigation.navigate('Register')} />
        <Button title="Уже есть аккаунт" variant="secondary" onPress={() => navigation.navigate('Login')} />
      </Card>
    </Screen>
  );
}
