import { StyleSheet, Text, View } from 'react-native';
import { Badge } from './Badge';
import { useTheme } from '../theme/ThemeProvider';
import { formatRoleLabel, formatStatusLabel } from '../../core/format';

type RequestStatusStripProps = {
  status?: string | null;
  nextTurn?: 'driver' | 'passenger' | null;
  movesLeftPassenger?: number | null;
  movesLeftDriver?: number | null;
};

export function RequestStatusStrip({
  status,
  nextTurn,
  movesLeftPassenger,
  movesLeftDriver,
}: RequestStatusStripProps) {
  const { theme } = useTheme();
  const normalizedStatus = String(status ?? 'pending').toLowerCase();

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.cardGlass,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Статус заявки</Text>
        <Badge label={normalizedStatus} />
      </View>
      <Text style={[styles.caption, { color: theme.colors.muted }]}>
        {formatStatusLabel(normalizedStatus)}
      </Text>

      {nextTurn ? (
        <Text style={[styles.caption, { color: theme.colors.muted }]}>Ход: {formatRoleLabel(nextTurn)}</Text>
      ) : null}

      {movesLeftPassenger !== null && movesLeftPassenger !== undefined ? (
        <Text style={[styles.caption, { color: theme.colors.muted }]}>
          Ходы остались: пассажир {Math.max(0, Number(movesLeftPassenger))}, водитель{' '}
          {Math.max(0, Number(movesLeftDriver ?? 0))}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
  },
});
