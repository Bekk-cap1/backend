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
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Reset password</Text>
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
        <Input label="Code" value={code} onChangeText={setCode} placeholder="123456" />
        <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button
          title="Request reset"
          onPress={async () => {
            const normalizedPhone = normalizePhone(phone);
            const validationError = getPhoneValidationError(normalizedPhone);
            if (validationError) {
              setPhoneError(validationError);
              return;
            }

            try {
              await requestPasswordReset(normalizedPhone);
              show({ title: 'Reset code sent', tone: 'success' });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
        <Button
          title="Confirm reset"
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
              show({ title: 'Password updated', tone: 'success' });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>
    </Screen>
  );
}
