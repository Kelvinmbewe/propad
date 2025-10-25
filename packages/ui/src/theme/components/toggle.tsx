'use client';

import { Moon, Sun } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils';
import { useAuroraTheme } from '../provider';

type AuroraThemeToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

export function AuroraThemeToggle({ className, label = 'Toggle theme', ...props }: AuroraThemeToggleProps) {
  const { mode, toggle } = useAuroraTheme();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] px-4 py-2 text-sm font-medium text-[color:var(--aurora-color-text)] shadow-aurora transition hover:-translate-y-0.5 hover:shadow-auroraBold focus-visible:outline-none focus-visible:shadow-auroraFocus',
        className
      )}
      {...props}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--aurora-color-input)] text-[color:var(--aurora-color-accent)]">
        {mode === 'light' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </span>
      <span>{mode === 'light' ? 'Light' : 'Dark'} mode</span>
    </button>
  );
}
