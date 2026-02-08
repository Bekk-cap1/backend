export type ThemeMode = 'light' | 'dark';

export const themeTokens = {
  light: {
    bg: '#f4f7fb',
    card: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    accent: '#0891b2',
    danger: '#dc2626',
  },
  dark: {
    bg: '#020617',
    card: '#0f172a',
    text: '#e2e8f0',
    muted: '#94a3b8',
    accent: '#22d3ee',
    danger: '#f87171',
  },
} as const;

export type StatusKind =
  | 'active'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'banned'
  | 'paid'
  | 'failed';

export function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const value = status.trim().toLowerCase();
  if (['active', 'approved', 'completed', 'paid', 'resolved'].includes(value)) {
    return 'success';
  }
  if (['pending', 'in_progress', 'queued', 'draft'].includes(value)) {
    return 'warning';
  }
  if (['rejected', 'cancelled', 'banned', 'failed'].includes(value)) {
    return 'danger';
  }
  return 'neutral';
}

export type DataTableQueryState = {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, string | number | boolean | undefined>;
};

export function toQueryString(state: DataTableQueryState): string {
  const params = new URLSearchParams();
  params.set('page', String(state.page));
  params.set('pageSize', String(state.pageSize));
  if (state.sort) params.set('sort', state.sort);
  if (state.order) params.set('order', state.order);
  if (state.search) params.set('search', state.search);
  for (const [key, value] of Object.entries(state.filters ?? {})) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

