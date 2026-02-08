import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeSearchScreen } from '../../screens/passenger/HomeSearch';
import { MyTripsScreen } from '../../screens/passenger/MyTrips';
import { PassengerNotificationsScreen } from '../../screens/passenger/Notifications';
import { PassengerSupportScreen } from '../../screens/passenger/Support';
import { PassengerProfileScreen } from '../../screens/passenger/Profile';

const Tabs = createBottomTabNavigator();

export function PassengerTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Home" component={HomeSearchScreen} />
      <Tabs.Screen name="MyTrips" component={MyTripsScreen} />
      <Tabs.Screen name="Alerts" component={PassengerNotificationsScreen} />
      <Tabs.Screen name="Support" component={PassengerSupportScreen} />
      <Tabs.Screen name="Profile" component={PassengerProfileScreen} />
    </Tabs.Navigator>
  );
}
