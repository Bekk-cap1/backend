import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthGate } from '../guards/AuthGate';
import { useAuth } from '../../stores/auth/auth.context';
import { AuthStack } from './AuthStack';
import { PassengerTabs } from './PassengerTabs';
import { DriverTabs } from './DriverTabs';
import { AdminBlockedScreen } from '../../screens/auth/AdminBlocked';
import { SearchResultsScreen } from '../../screens/passenger/SearchResults';
import { TripDetailsScreen } from '../../screens/passenger/TripDetails';
import { CreateRequestScreen } from '../../screens/passenger/CreateRequest';
import { PassengerNegotiationScreen } from '../../screens/passenger/Negotiation';
import { BookingDetailsScreen } from '../../screens/passenger/BookingDetails';
import { PaymentsScreen } from '../../screens/passenger/Payments';
import { DriverVerificationScreen } from '../../screens/driver/Verification';
import { VehiclesScreen } from '../../screens/driver/Vehicles';
import { CreateTripScreen } from '../../screens/driver/CreateTrip';
import { DriverNegotiationScreen } from '../../screens/driver/Negotiation';
import { ActiveTripScreen } from '../../screens/driver/ActiveTrip';
import { DriverBookingsScreen } from '../../screens/driver/DriverBookings';
import { DriverSupportScreen } from '../../screens/driver/Support';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { state } = useAuth();

  return (
    <AuthGate>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.status === 'anonymous' ? <Stack.Screen name="AuthStack" component={AuthStack} /> : null}
        {state.status === 'blocked' ? <Stack.Screen name="AdminBlocked" component={AdminBlockedScreen} /> : null}
        {state.status === 'authenticated' && state.user?.role === 'passenger' ? (
          <>
            <Stack.Screen name="PassengerTabs" component={PassengerTabs} />
            <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
            <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
            <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
            <Stack.Screen name="PassengerNegotiation" component={PassengerNegotiationScreen} />
            <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
            <Stack.Screen name="Payments" component={PaymentsScreen} />
          </>
        ) : null}
        {state.status === 'authenticated' && state.user?.role === 'driver' ? (
          <>
            <Stack.Screen name="DriverTabs" component={DriverTabs} />
            <Stack.Screen name="DriverVerification" component={DriverVerificationScreen} />
            <Stack.Screen name="Vehicles" component={VehiclesScreen} />
            <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
            <Stack.Screen name="DriverNegotiation" component={DriverNegotiationScreen} />
            <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
            <Stack.Screen name="DriverBookings" component={DriverBookingsScreen} />
            <Stack.Screen name="DriverSupport" component={DriverSupportScreen} />
          </>
        ) : null}
      </Stack.Navigator>
    </AuthGate>
  );
}
