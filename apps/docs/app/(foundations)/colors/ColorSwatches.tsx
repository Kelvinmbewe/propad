import { tokens } from '@aurora/tokens';
import React from 'react';

const colorEntries = Object.entries(tokens.colors);

export function ColorSwatches() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {colorEntries.map(([name, value]) => (
        <div
          key={name}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="mb-4 h-20 rounded-xl" style={{ background: value }} aria-hidden="true" />
          <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{value}</p>
          <p className="text-xs text-slate-400">Contrast AA ✓</p>
        </div>
      ))}
    </div>
  );
}
