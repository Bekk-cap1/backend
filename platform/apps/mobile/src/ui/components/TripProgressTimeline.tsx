import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type TripProgressState = 'completed' | 'active' | 'pending' | 'failed';

export type TripProgressStep = {
  id: string;
  label: string;
  state: TripProgressState;
  subtitle?: string;
};

export function TripProgressTimeline({ steps }: { steps: TripProgressStep[] }) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const dotColor =
          step.state === 'completed'
            ? theme.colors.success
            : step.state === 'active'
              ? theme.colors.primary
              : step.state === 'failed'
                ? theme.colors.danger
                : theme.colors.border;
        const lineColor =
          step.state === 'completed' || step.state === 'active'
            ? theme.colors.primary
            : theme.colors.border;

        return (
          <View key={step.id} style={styles.row}>
            <View style={styles.trackColumn}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              {!isLast ? (
                <View style={[styles.line, { backgroundColor: lineColor }]} />
              ) : null}
            </View>

            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  {
                    color:
                      step.state === 'pending'
                        ? theme.colors.muted
                        : theme.colors.text,
                  },
                ]}
              >
                {step.label}
              </Text>
              {step.subtitle ? (
                <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
                  {step.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 44,
  },
  trackColumn: {
    width: 18,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  line: {
    marginTop: 4,
    width: 2,
    flex: 1,
    borderRadius: 999,
  },
  content: {
    flex: 1,
    paddingBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
  },
});
