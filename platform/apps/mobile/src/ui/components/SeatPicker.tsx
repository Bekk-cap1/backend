import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';

type SeatState = 'available' | 'selected' | 'taken' | 'blocked';

export type SeatPickerProps = {
  seatsRequired: number;
  selectedSeats: string[];
  takenSeats?: string[];
  blockedSeats?: string[];
  onChange: (next: string[]) => void;
};

const ROWS = 4;
const COLUMNS = ['A', 'B', 'C', 'D'] as const;

export function SeatPicker({
  seatsRequired,
  selectedSeats,
  takenSeats = [],
  blockedSeats = [],
  onChange,
}: SeatPickerProps) {
  const { theme } = useTheme();

  const taken = useMemo(() => new Set(takenSeats), [takenSeats]);
  const blocked = useMemo(() => new Set(blockedSeats), [blockedSeats]);

  const toggleSeat = (seat: string, state: SeatState) => {
    if (state === 'taken' || state === 'blocked') return;
    const current = new Set(selectedSeats);
    if (current.has(seat)) {
      current.delete(seat);
      onChange(Array.from(current));
      return;
    }
    if (current.size >= Math.max(1, seatsRequired)) return;
    current.add(seat);
    onChange(Array.from(current));
  };

  const resolveSeatState = (seat: string): SeatState => {
    if (blocked.has(seat)) return 'blocked';
    if (taken.has(seat)) return 'taken';
    if (selectedSeats.includes(seat)) return 'selected';
    return 'available';
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Seat selection</Text>
      <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
        Select {Math.max(1, seatsRequired)} seat(s)
      </Text>

      {Array.from({ length: ROWS }).map((_, rowIndex) => {
        const row = rowIndex + 1;
        return (
          <View key={row} style={styles.row}>
            {COLUMNS.map((col) => {
              const seat = `${row}${col}`;
              const state = resolveSeatState(seat);
              const backgroundColor =
                state === 'selected'
                  ? theme.colors.primary
                  : state === 'taken'
                    ? theme.colors.muted
                    : state === 'blocked'
                      ? theme.colors.warning
                      : theme.colors.card;
              const textColor =
                state === 'selected' ? '#fff' : state === 'taken' ? '#fff' : theme.colors.text;

              return (
                <View key={seat} style={col === 'C' ? styles.afterAisle : undefined}>
                  <Pressable
                    disabled={state === 'taken' || state === 'blocked'}
                    onPress={() => toggleSeat(seat, state)}
                    style={[
                      styles.seat,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor,
                        opacity: state === 'taken' ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.seatText, { color: textColor }]}>{seat}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        );
      })}

      <View style={styles.legend}>
        <LegendItem label="Available" color={theme.colors.card} border={theme.colors.border} />
        <LegendItem label="Selected" color={theme.colors.primary} border={theme.colors.primary} />
        <LegendItem label="Taken" color={theme.colors.muted} border={theme.colors.muted} />
      </View>
    </View>
  );
}

function LegendItem({
  label,
  color,
  border,
}: {
  label: string;
  color: string;
  border: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor: border }]} />
      <Text style={[styles.legendText, { color: theme.colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  afterAisle: {
    marginLeft: 10,
  },
  seat: {
    width: 56,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatText: {
    fontSize: 13,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 12,
  },
});
