'use client';

import { useAurora } from '@aurora/ui';
import React from 'react';

export const DocsToolbar: React.FC = () => {
  const { theme, setTheme } = useAurora();
  const [density, setDensity] = React.useState<'comfortable' | 'compact'>('comfortable');
  const [locale, setLocale] = React.useState<'en-ZW' | 'en-US'>('en-ZW');

  React.useEffect(() => {
    document.body.dataset.density = density;
    document.documentElement.lang = locale;
  }, [density, locale]);

  return (
    <div className="sticky top-4 z-50 mb-8 flex flex-wrap items-center gap-4 rounded-full border border-slate-200 bg-white/80 px-6 py-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Theme</span>
        <button
          className={`rounded-full px-3 py-1 text-sm font-medium ${theme.name === 'light' ? 'bg-aurora-primary text-white' : 'text-slate-500'}`}
          onClick={() => setTheme('light')}
        >
          Light
        </button>
        <button
          className={`rounded-full px-3 py-1 text-sm font-medium ${theme.name === 'dark' ? 'bg-aurora-accent text-white' : 'text-slate-500'}`}
          onClick={() => setTheme('dark')}
        >
          Dark
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Density</span>
        <button
          className={`rounded-full px-3 py-1 text-sm ${density === 'comfortable' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}
          onClick={() => setDensity('comfortable')}
        >
          Cozy
        </button>
        <button
          className={`rounded-full px-3 py-1 text-sm ${density === 'compact' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'}`}
          onClick={() => setDensity('compact')}
        >
          Compact
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        Locale
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as 'en-ZW' | 'en-US')}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="en-ZW">English (Zimbabwe)</option>
          <option value="en-US">English (US)</option>
        </select>
      </label>
    </div>
  );
};
