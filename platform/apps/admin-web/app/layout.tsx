import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../lib/providers';

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem('admin_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next === 'dark');
  } catch {}
})();
`;

export const metadata: Metadata = {
  title: 'Intercity Admin Platform',
  description: 'Admin panel for Intercity operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
