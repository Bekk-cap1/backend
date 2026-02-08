import { View, Text } from 'react-native';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '600' }}>{title}</Text>
      {description ? <Text style={{ textAlign: 'center' }}>{description}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
