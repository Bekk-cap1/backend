import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DriverHomeScreen } from '../../screens/driver/DriverHome';
import { DriverTripsScreen } from '../../screens/driver/TripPublish';
import { RequestsInboxScreen } from '../../screens/driver/RequestsInbox';
import { DriverNotificationsScreen } from '../../screens/driver/Notifications';
import { DriverProfileScreen } from '../../screens/driver/DriverProfile';
import { useTheme } from '../../ui/theme/ThemeProvider';
import { DriverVerificationScreen } from '../../screens/driver/Verification';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapPayload } from '../../api/mappers/dto';

const Tabs = createBottomTabNavigator();

export function DriverTabs() {
  const { theme } = useTheme();
  const driverProfile = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);
  const isVerified = String(driverProfile.data?.status ?? '').toLowerCase() === 'verified';

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
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
      <Tabs.Screen name="Home" component={DriverHomeScreen} options={{ title: 'Диспетчер' }} />
      <Tabs.Screen
        name="Requests"
        component={isVerified ? RequestsInboxScreen : DriverVerificationScreen}
        options={{ title: isVerified ? 'Заявки' : 'Проверка' }}
      />
      <Tabs.Screen
        name="Trips"
        component={isVerified ? DriverTripsScreen : DriverVerificationScreen}
        options={{ title: isVerified ? 'Рейсы' : 'KYC' }}
      />
      <Tabs.Screen name="Alerts" component={DriverNotificationsScreen} options={{ title: 'Уведомления' }} />
      <Tabs.Screen name="Profile" component={DriverProfileScreen} options={{ title: 'Профиль' }} />
    </Tabs.Navigator>
  );
}
