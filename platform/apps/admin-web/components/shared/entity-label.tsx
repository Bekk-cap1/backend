import { cn } from '../../lib/cn';

type EntityLabelProps = {
  title: string;
  id?: string | null;
  codeLength?: number;
  className?: string;
};

function shortCodeFromId(id: string, codeLength: number) {
  return id.replace(/-/g, '').slice(0, codeLength).toUpperCase();
}

export function EntityLabel({
  title,
  id,
  codeLength = 8,
  className,
}: EntityLabelProps) {
  const normalizedId = typeof id === 'string' && id.trim().length > 0 ? id.trim() : null;
  const code = normalizedId ? shortCodeFromId(normalizedId, codeLength) : null;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="font-medium">{title}</div>
      {normalizedId ? (
        <div className="font-mono text-xs text-muted-foreground">
          {code ? `#${code} · ` : ''}
          {normalizedId}
        </div>
      ) : null}
    </div>
  );
}
