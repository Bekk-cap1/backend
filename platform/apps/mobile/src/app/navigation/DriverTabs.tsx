import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DriverHomeScreen } from '../../screens/driver/DriverHome';
import { DriverTripsScreen } from '../../screens/driver/TripPublish';
import { RequestsInboxScreen } from '../../screens/driver/RequestsInbox';
import { DriverNotificationsScreen } from '../../screens/driver/Notifications';
import { DriverProfileScreen } from '../../screens/driver/DriverProfile';

const Tabs = createBottomTabNavigator();

export function DriverTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" component={DriverHomeScreen} />
      <Tabs.Screen name="Trips" component={DriverTripsScreen} />
      <Tabs.Screen name="Requests" component={RequestsInboxScreen} />
      <Tabs.Screen name="Alerts" component={DriverNotificationsScreen} />
      <Tabs.Screen name="Profile" component={DriverProfileScreen} />
    </Tabs.Navigator>
  );
}
