export type ThemeMode = 'light' | 'dark';

export type ThemePalette = {
  bg: string;
  card: string;
  cardGlass: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  accent2: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
};

export type ThemeTokens = {
  mode: ThemeMode;
  colors: ThemePalette;
  radius: {
    md: number;
    lg: number;
  };
  typography: {
    h1: { fontSize: number; lineHeight: number; fontWeight: '600' };
    h2: { fontSize: number; lineHeight: number; fontWeight: '600' };
    body: { fontSize: number; lineHeight: number; fontWeight: '400' };
    caption: { fontSize: number; lineHeight: number; fontWeight: '400' };
  };
};

const base = {
  radius: { md: 14, lg: 20 },
  typography: {
    h1: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
    h2: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
    body: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  },
};

export const darkTheme: ThemeTokens = {
  mode: 'dark',
  colors: {
    bg: '#0B1026',
    card: '#121A3A',
    cardGlass: 'rgba(18,26,58,0.65)',
    text: '#EAF0FF',
    muted: '#93A4C7',
    primary: '#4F7CFF',
    accent: '#00D1FF',
    accent2: '#FB7185',
    success: '#20C997',
    warning: '#FFB020',
    danger: '#FF4D4F',
    border: 'rgba(255,255,255,0.08)',
  },
  ...base,
};

export const lightTheme: ThemeTokens = {
  mode: 'light',
  colors: {
    bg: '#F6F7FB',
    card: '#FFFFFF',
    cardGlass: 'rgba(255,255,255,0.78)',
    text: '#0E1222',
    muted: '#667085',
    primary: '#4F7CFF',
    accent: '#00D1FF',
    accent2: '#FB7185',
    success: '#20C997',
    warning: '#FFB020',
    danger: '#FF4D4F',
    border: '#E6E8F0',
  },
  ...base,
};
