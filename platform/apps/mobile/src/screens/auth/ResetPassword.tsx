import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { useAuth } from '../../stores/auth/auth.context';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function ResetPasswordScreen() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const { show } = useToast();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Reset password</Text>
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+998901234567" />
        <Input label="Code" value={code} onChangeText={setCode} placeholder="123456" />
        <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button
          title="Request reset"
          onPress={async () => {
            try {
              await requestPasswordReset(phone.trim());
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
            try {
              await confirmPasswordReset(phone.trim(), code.trim(), password);
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
