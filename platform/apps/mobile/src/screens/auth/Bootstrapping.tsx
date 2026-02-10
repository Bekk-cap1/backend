import { ActivityIndicator, Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';

export function BootstrappingScreen() {
  return (
    <Screen>
      <Card>
        <ActivityIndicator />
        <Text style={{ textAlign: 'center', opacity: 0.8 }}>
          Preparing session...
        </Text>
      </Card>
    </Screen>
  );
}
