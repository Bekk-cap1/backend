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
      show({ title: 'Full name is required (min 2 chars).', tone: 'danger' });
      return;
    }

    if (!acceptTerms) {
      show({ title: 'Please accept Terms and Privacy policy.', tone: 'danger' });
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
          title: 'Account created. Complete driver KYC in profile to unlock driver mode.',
          tone: 'info',
        });
      } else {
        show({ title: 'Account created', tone: 'success' });
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
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Create account</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Passenger"
            variant={mode === 'passenger' ? 'primary' : 'secondary'}
            onPress={() => setMode('passenger')}
          />
          <Button
            title="Driver"
            variant={mode === 'driver' ? 'primary' : 'secondary'}
            onPress={() => setMode('driver')}
          />
        </View>

        <Input
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="John Doe"
        />
        <Input
          label="Phone"
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
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Minimum 6 chars"
        />

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '600' }}>Language</Text>
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
          <Text>I accept Terms and Privacy policy</Text>
          <Switch value={acceptTerms} onValueChange={setAcceptTerms} />
        </View>

        <Button title="Create account" loading={loading} onPress={onSubmit} />
        <Button
          title="Already have account"
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
        />
      </Card>
    </Screen>
  );
}
