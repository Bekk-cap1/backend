import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useAuth } from '../../stores/auth/auth.context';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function LoginScreen({ navigation }: { navigation: any }) {
  const { login } = useAuth();
  const { show } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await login(phone.trim(), password);
      show({ title: 'Signed in', tone: 'success' });
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Sign in</Text>
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+998901234567" keyboardType="phone-pad" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
        <Button title="Sign in" loading={loading} onPress={onSubmit} />
        <Button title="Forgot password?" variant="ghost" onPress={() => navigation.navigate('ResetPassword')} />
        <Button title="Create account" variant="secondary" onPress={() => navigation.navigate('Register')} />
      </Card>
    </Screen>
  );
}
