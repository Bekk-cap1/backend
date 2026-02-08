import { ReactNode } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`.trim()} />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, description, retry }: { title: string; description: string; retry?: () => void }) {
  return (
    <div className="rounded-md border border-red-400/30 bg-red-100/40 p-4 text-sm dark:bg-red-900/20">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-muted-foreground">{description}</div>
      {retry ? (
        <button className="mt-2 text-primary underline" onClick={retry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
