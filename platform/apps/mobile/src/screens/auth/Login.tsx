import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useAuth } from '../../stores/auth/auth.context';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { getPhoneValidationError, normalizePhone, sanitizePhoneInput } from '../../core/validation/phone';

export function LoginScreen({ navigation }: { navigation: any }) {
  const { login } = useAuth();
  const { show } = useToast();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const normalizedPhone = normalizePhone(phone);
    const validationError = getPhoneValidationError(normalizedPhone);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }

    setLoading(true);
    try {
      await login(normalizedPhone, password);
      show({ title: 'Вход выполнен', tone: 'success' });
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Вход</Text>
        <Input
          label="Телефон"
          value={phone}
          onChangeText={(value) => {
            setPhone(sanitizePhoneInput(value));
            if (phoneError) setPhoneError(null);
          }}
          error={phoneError}
          placeholder="+998901234567"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <Input
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Пароль"
        />
        <Button title="Войти" loading={loading} onPress={onSubmit} />
        <Button title="Забыли пароль" variant="ghost" onPress={() => navigation.navigate('ResetPassword')} />
        <Button title="Создать аккаунт" variant="secondary" onPress={() => navigation.navigate('Register')} />
      </Card>
    </Screen>
  );
}
