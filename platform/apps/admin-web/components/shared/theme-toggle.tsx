'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('admin_theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const next = stored ?? (prefersDark ? 'dark' : 'light');
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, []);

  const setThemeMode = (next: 'light' | 'dark') => {
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('admin_theme', next);
  };

  return (
    <div className="rounded-md border border-border bg-muted/40 p-1">
      <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">Theme</div>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => setThemeMode('light')}
          className={cn(
            'rounded-md px-2 py-1.5 text-xs transition-colors',
            theme === 'light'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-muted',
          )}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => setThemeMode('dark')}
          className={cn(
            'rounded-md px-2 py-1.5 text-xs transition-colors',
            theme === 'dark'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-muted',
          )}
        >
          Dark
        </button>
      </div>
    </div>
  );
}
