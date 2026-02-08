import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppRoot } from './src/app';
import { appLinking } from './src/app/navigation/linking';

export default function App() {
  return (
    <NavigationContainer linking={appLinking as any}>
      <StatusBar style="auto" />
      <AppRoot />
    </NavigationContainer>
  );
}
