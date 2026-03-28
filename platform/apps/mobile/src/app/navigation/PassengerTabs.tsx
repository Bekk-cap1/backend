import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeSearchScreen } from '../../screens/passenger/HomeSearch';
import { MyTripsScreen } from '../../screens/passenger/MyTrips';
import { PassengerNotificationsScreen } from '../../screens/passenger/Notifications';
import { PassengerSupportScreen } from '../../screens/passenger/Support';
import { PassengerProfileScreen } from '../../screens/passenger/Profile';
import { useTheme } from '../../ui/theme/ThemeProvider';

const Tabs = createBottomTabNavigator();

export function PassengerTabs() {
  const { theme } = useTheme();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen name="Home" component={HomeSearchScreen} options={{ title: 'Главная' }} />
      <Tabs.Screen name="MyTrips" component={MyTripsScreen} options={{ title: 'Мои поездки' }} />
      <Tabs.Screen name="Alerts" component={PassengerNotificationsScreen} options={{ title: 'Уведомления' }} />
      <Tabs.Screen name="Support" component={PassengerSupportScreen} options={{ title: 'Поддержка' }} />
      <Tabs.Screen name="Profile" component={PassengerProfileScreen} options={{ title: 'Профиль' }} />
    </Tabs.Navigator>
  );
}
