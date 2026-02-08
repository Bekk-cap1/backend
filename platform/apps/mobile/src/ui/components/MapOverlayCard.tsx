import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { GlassCard } from './Card';

export function MapOverlayCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <GlassCard style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
      <Text style={{ fontWeight: '700' }}>{title}</Text>
      {children}
    </GlassCard>
  );
}
