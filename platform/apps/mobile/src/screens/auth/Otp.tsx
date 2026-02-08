import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useAuth } from '../../stores/auth/auth.context';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function OtpScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const { show } = useToast();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>OTP verification</Text>
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+998901234567" keyboardType="phone-pad" />
        <Input label="Code" value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" />
        <Button
          title="Send code"
          onPress={async () => {
            try {
              await sendOtp(phone.trim());
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
            try {
              await verifyOtp(phone.trim(), code.trim());
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
