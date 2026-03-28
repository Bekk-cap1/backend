import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useToast } from '../../ui/components/Toast';
import { useAuth } from '../../stores/auth/auth.context';
import { toErrorMessage } from '../../core/errors';
import { getPhoneValidationError, normalizePhone, sanitizePhoneInput } from '../../core/validation/phone';

export function ResetPasswordScreen() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const { show } = useToast();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Сброс пароля</Text>
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
        />
        <Input label="Код" value={code} onChangeText={setCode} placeholder="123456" />
        <Input label="Новый пароль" value={password} onChangeText={setPassword} secureTextEntry />

        <Button
          title="Запросить код"
          onPress={async () => {
            const normalizedPhone = normalizePhone(phone);
            const validationError = getPhoneValidationError(normalizedPhone);
            if (validationError) {
              setPhoneError(validationError);
              return;
            }

            try {
              await requestPasswordReset(normalizedPhone);
              show({ title: 'Код отправлен', tone: 'success' });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />

        <Button
          title="Обновить пароль"
          variant="secondary"
          onPress={async () => {
            const normalizedPhone = normalizePhone(phone);
            const validationError = getPhoneValidationError(normalizedPhone);
            if (validationError) {
              setPhoneError(validationError);
              return;
            }

            try {
              await confirmPasswordReset(normalizedPhone, code.trim(), password);
              show({ title: 'Пароль обновлен', tone: 'success' });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>
    </Screen>
  );
}
