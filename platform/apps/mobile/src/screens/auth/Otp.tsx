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

export function OtpScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const { show } = useToast();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>OTP verification</Text>
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
        <Input label="Code" value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" />
        <Button
          title="Send code"
          onPress={async () => {
            const normalizedPhone = normalizePhone(phone);
            const validationError = getPhoneValidationError(normalizedPhone);
            if (validationError) {
              setPhoneError(validationError);
              return;
            }

            try {
              await sendOtp(normalizedPhone);
              show({ title: 'OTP sent', tone: 'success' });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
        <Button
          title="Verify"
          variant="secondary"
          onPress={async () => {
            const normalizedPhone = normalizePhone(phone);
            const validationError = getPhoneValidationError(normalizedPhone);
            if (validationError) {
              setPhoneError(validationError);
              return;
            }

            try {
              await verifyOtp(normalizedPhone, code.trim());
              show({ title: 'OTP verified', tone: 'success' });
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>
    </Screen>
  );
}
