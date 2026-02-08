import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import type { UserRole } from '@platform/shared';
import { useTheme } from '../../ui/theme/ThemeProvider';

export function RoleGate({
  role,
  allow,
  children,
  fallback,
}: {
  role: UserRole | null;
  allow: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { theme } = useTheme();

  if (!role || !allow.includes(role)) {
    if (fallback) return <>{fallback}</>;

    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg, padding: 20 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>Access denied</Text>
        <Text style={{ color: theme.colors.muted, marginTop: 8, textAlign: 'center' }}>
          This screen is not available for your role.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
