import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../../screens/auth/Welcome';
import { LoginScreen } from '../../screens/auth/Login';
import { RegisterScreen } from '../../screens/auth/Register';
import { OtpScreen } from '../../screens/auth/Otp';
import { ResetPasswordScreen } from '../../screens/auth/ResetPassword';

const Stack = createNativeStackNavigator();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
