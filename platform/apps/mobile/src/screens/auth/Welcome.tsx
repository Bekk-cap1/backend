import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';

export function WelcomeScreen({ navigation }: { navigation: any }) {
  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 26, fontWeight: '700' }}>Intercity rides, with control</Text>
        <Text style={{ opacity: 0.8 }}>
          Book seats, negotiate price, track route and radars.
        </Text>
        <Button title="Continue" onPress={() => navigation.navigate('Register')} />
        <Button title="I already have an account" variant="secondary" onPress={() => navigation.navigate('Login')} />
      </Card>
    </Screen>
  );
}
