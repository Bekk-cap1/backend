'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('admin_theme') as 'light' | 'dark' | null;
    const next = stored ?? 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, []);

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('admin_theme', next);
  };

  return (
    <button className="rounded-md border px-3 py-2 text-sm" onClick={toggle}>
      Theme: {theme}
    </button>
  );
}
