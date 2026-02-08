import { useState } from 'react';
import { View, Text } from 'react-native';
import { ModalSheet } from './ModalSheet';
import { Input } from './Input';
import { Button } from './Button';

export function ConfirmDialog({
  visible,
  title,
  description,
  requireReason = false,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  description?: string;
  requireReason?: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{title}</Text>
        {description ? <Text>{description}</Text> : null}
        {requireReason ? (
          <Input value={reason} onChangeText={setReason} label="Reason" placeholder="Add reason" />
        ) : null}
        <View style={{ gap: 8 }}>
          <Button
            title="Confirm"
            variant="destructive"
            onPress={() => {
              onConfirm(reason || undefined);
              setReason('');
            }}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              setReason('');
              onClose();
            }}
          />
        </View>
      </View>
    </ModalSheet>
  );
}
