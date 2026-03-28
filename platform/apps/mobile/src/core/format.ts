export const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  pending: 'Ожидает',
  accepted: 'Принято',
  rejected: 'Отклонено',
  canceled: 'Отменено',
  cancelled: 'Отменено',
  expired: 'Истекло',
  confirmed: 'Подтверждено',
  paid: 'Оплачено',
  started: 'В пути',
  completed: 'Завершено',
  published: 'Опубликовано',
  active: 'Активно',
  in_progress: 'В работе',
  verified: 'Проверено',
  unresolved: 'Не решено',
  resolved: 'Решено',
  open: 'Открыт',
  closed: 'Закрыт',
  failed: 'Ошибка',
  unpaid: 'Не оплачено',
};

const ROLE_LABELS: Record<string, string> = {
  passenger: 'Пассажир',
  driver: 'Водитель',
  admin: 'Админ',
  moderator: 'Модератор',
  finance: 'Финансы',
  support: 'Поддержка',
  ops: 'Операции',
  superadmin: 'Суперадмин',
};

export function formatMoney(amount: number, currency = 'UZS', locale = 'ru-RU') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDateTime(value: string | Date, locale = 'ru-RU') {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString(locale)} ${date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function formatDateOnly(value: string | Date, locale = 'ru-RU') {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale);
}

export function formatDistance(distanceMeters?: number | null) {
  if (!Number.isFinite(Number(distanceMeters))) {
    return '-';
  }

  const value = Number(distanceMeters);
  if (value < 1000) {
    return `${Math.max(0, Math.round(value))} м`;
  }

  return `${(value / 1000).toFixed(1)} км`;
}

export function formatEtaSeconds(seconds?: number | null) {
  if (!Number.isFinite(Number(seconds))) {
    return 'Считаем...';
  }

  const value = Math.max(0, Number(seconds));
  const minutes = Math.round(value / 60);
  if (minutes < 60) {
    return `${Math.max(1, minutes)} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours} ч ${restMinutes} мин` : `${hours} ч`;
}

export function formatStatusLabel(status?: string | null) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) return '?';
  return STATUS_LABELS[normalized] ?? normalized;
}

export function formatRoleLabel(role?: string | null) {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (!normalized) return '?';
  return ROLE_LABELS[normalized] ?? normalized;
}

export function formatEntityLabel(prefix: string, value?: string | null) {
  if (!value) return prefix;
  const compact = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!compact) return prefix;

  return `${prefix} #${compact.slice(0, 8)}`;
}
