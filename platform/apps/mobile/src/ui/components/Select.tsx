import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ModalSheet } from './ModalSheet';

export type SelectOption = {
  label: string;
  value: string;
  hint?: string;
};

type SelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function Select({
  label,
  value,
  options,
  placeholder = 'Select option',
  onChange,
  disabled = false,
}: SelectProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((item) => item.value === value),
    [options, value],
  );

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 11,
          backgroundColor: theme.colors.card,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text style={{ color: selected ? theme.colors.text : theme.colors.muted }}>
          {selected?.label ?? placeholder}
        </Text>
      </Pressable>

      <ModalSheet visible={open} onClose={() => setOpen(false)}>
        <View style={{ gap: 12 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>
            {label}
          </Text>
          <ScrollView style={{ maxHeight: 320 }}>
            <View style={{ gap: 8 }}>
              {options.map((item) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: theme.colors.card,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      }}
                    >
                      {item.label}
                    </Text>
                    {item.hint ? (
                      <Text style={{ color: theme.colors.muted, marginTop: 2 }}>
                        {item.hint}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
              {!options.length ? (
                <Text style={{ color: theme.colors.muted }}>No options available</Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </ModalSheet>
    </View>
  );
}
