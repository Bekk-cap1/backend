import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type ToastPayload = {
  title: string;
  tone?: 'info' | 'success' | 'danger';
};

type ToastContextValue = {
  show: (payload: ToastPayload) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const show = useCallback((payload: ToastPayload) => {
    setToast(payload);
    setTimeout(() => setToast(null), 2600);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  const toneColor = toast?.tone === 'danger' ? theme.colors.danger : toast?.tone === 'success' ? theme.colors.success : theme.colors.accent;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View style={[styles.container, { borderColor: toneColor, backgroundColor: theme.colors.card }]}> 
          <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{toast.title}</Text>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
