import { useState } from 'react';
import { Text, View, Switch } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useAuth } from '../../stores/auth/auth.context';
import { toErrorMessage } from '../../core/errors';
import { useToast } from '../../ui/components/Toast';
import {
  getPhoneValidationError,
  normalizePhone,
  sanitizePhoneInput,
} from '../../core/validation/phone';

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { register } = useAuth();
  const { show } = useToast();
  const [mode, setMode] = useState<'passenger' | 'driver'>('passenger');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState<'ru' | 'uz' | 'en'>('ru');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const normalizedPhone = normalizePhone(phone);
    const validationError = getPhoneValidationError(normalizedPhone);
    if (validationError) {
      setPhoneError(validationError);
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      show({ title: 'Введите имя (минимум 2 символа).', tone: 'danger' });
      return;
    }

    if (!acceptTerms) {
      show({ title: 'Подтвердите согласие с условиями.', tone: 'danger' });
      return;
    }

    setLoading(true);
    try {
      await register({
        phone: normalizedPhone,
        password,
        fullName: fullName.trim(),
        language,
        acceptTerms: true,
      });

      if (mode === 'driver') {
        show({
          title: 'Аккаунт создан. Завершите KYC в профиле, чтобы открыть режим водителя.',
          tone: 'info',
        });
      } else {
        show({ title: 'Аккаунт создан', tone: 'success' });
      }
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Регистрация</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Пассажир"
            variant={mode === 'passenger' ? 'primary' : 'secondary'}
            onPress={() => setMode('passenger')}
          />
          <Button
            title="Водитель"
            variant={mode === 'driver' ? 'primary' : 'secondary'}
            onPress={() => setMode('driver')}
          />
        </View>

        <Input label="Полное имя" value={fullName} onChangeText={setFullName} placeholder="Ваше имя" />
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
          placeholder="Минимум 6 символов"
        />

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Язык</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['ru', 'uz', 'en'] as const).map((item) => (
              <Button
                key={item}
                title={item.toUpperCase()}
                variant={language === item ? 'primary' : 'secondary'}
                onPress={() => setLanguage(item)}
              />
            ))}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          <Text>Согласен с Terms и Privacy policy</Text>
          <Switch value={acceptTerms} onValueChange={setAcceptTerms} />
        </View>

        <Button title="Создать аккаунт" loading={loading} onPress={onSubmit} />
        <Button title="Уже есть аккаунт" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </Card>
    </Screen>
  );
}
