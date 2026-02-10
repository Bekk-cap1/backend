import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Input } from '../Input';
import { Select, type SelectOption } from '../Select';

type RouteRibbonProps = {
  from: string;
  to: string;
  date: string;
  seats: string;
  cityOptions: SelectOption[];
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSeatsChange: (value: string) => void;
  onSwap?: () => void;
};

export function RouteRibbon({
  from,
  to,
  date,
  seats,
  cityOptions,
  onFromChange,
  onToChange,
  onDateChange,
  onSeatsChange,
  onSwap,
}: RouteRibbonProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
        padding: 12,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>Route Ribbon</Text>
        {onSwap ? (
          <Pressable onPress={onSwap}>
            <Text style={{ color: theme.colors.accent, fontWeight: '700' }}>Swap</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Select
            label="From"
            value={from}
            options={cityOptions}
            onChange={onFromChange}
            placeholder="Select departure city"
          />
        </View>
        <View style={{ width: 28, alignItems: 'center' }}>
          <View style={{ width: 20, height: 2, backgroundColor: theme.colors.accent }} />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.colors.accent2,
              marginTop: 4,
              marginBottom: 4,
            }}
          />
          <View style={{ width: 20, height: 2, backgroundColor: theme.colors.accent }} />
        </View>
        <View style={{ flex: 1 }}>
          <Select
            label="To"
            value={to}
            options={cityOptions}
            onChange={onToChange}
            placeholder="Select destination city"
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input label="Date" value={date} onChangeText={onDateChange} placeholder="YYYY-MM-DD" />
        </View>
        <View style={{ width: 110 }}>
          <Input label="Seats" value={seats} onChangeText={onSeatsChange} keyboardType="number-pad" />
        </View>
      </View>
    </View>
  );
}
