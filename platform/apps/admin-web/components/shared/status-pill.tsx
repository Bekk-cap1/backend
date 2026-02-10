import { cn } from '../../lib/cn';

const variantMap: Record<string, string> = {
  active: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-200',
  inactive: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
  verified: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-200',
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  draft: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
  published: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-200',
  started: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
  completed: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  paid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  succeeded: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected: 'bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200',
  canceled: 'bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200',
  failed: 'bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200',
  refunded: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200',
  banned: 'bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200',
  resolved: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  in_progress: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
  processing: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
  enqueued: 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200',
  done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  open: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
  read: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  unread: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
};

export function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize',
        variantMap[key] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {status}
    </span>
  );
}
