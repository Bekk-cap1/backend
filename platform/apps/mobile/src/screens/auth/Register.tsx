import { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useAuth } from '../../stores/auth/auth.context';
import { toErrorMessage } from '../../core/errors';
import { useToast } from '../../ui/components/Toast';

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { register } = useAuth();
  const { show } = useToast();
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await register(phone.trim(), password, role);
      show({ title: 'Account created', tone: 'success' });
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Create account</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Passenger" variant={role === 'passenger' ? 'primary' : 'secondary'} onPress={() => setRole('passenger')} />
          <Button title="Driver" variant={role === 'driver' ? 'primary' : 'secondary'} onPress={() => setRole('driver')} />
        </View>
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+998901234567" keyboardType="phone-pad" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimum 6 chars" />
        <Button title="Create account" loading={loading} onPress={onSubmit} />
        <Button title="Already have account" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </Card>
    </Screen>
  );
}
