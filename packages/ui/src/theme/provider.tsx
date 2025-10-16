'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { auroraCssVariables, type AuroraMode } from './aurora-tokens';

const STORAGE_KEY = 'aurora-theme-mode';

type AuroraThemeContextValue = {
  mode: AuroraMode;
  setMode: (mode: AuroraMode) => void;
  toggle: () => void;
};

const AuroraThemeContext = createContext<AuroraThemeContextValue | undefined>(undefined);

type AuroraThemeProviderProps = {
  initialMode?: AuroraMode | 'system';
  children: ReactNode;
};

const applyCssVariables = (mode: AuroraMode) => {
  if (typeof document === 'undefined') return;
  const vars = auroraCssVariables(mode);
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.dataset.auroraMode = mode;
  root.classList.toggle('aurora-dark', mode === 'dark');
  root.classList.toggle('aurora-light', mode === 'light');
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
};

const getStoredMode = (): AuroraMode | null => {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
};

const getSystemMode = (): AuroraMode => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function AuroraThemeProvider({ initialMode = 'system', children }: AuroraThemeProviderProps) {
  const [mode, setModeState] = useState<AuroraMode>(() => (initialMode === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    const stored = getStoredMode();
    if (stored) {
      setModeState(stored);
      return;
    }

    if (initialMode === 'system') {
      setModeState(getSystemMode());
    } else {
      setModeState(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    applyCssVariables(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => {
      setModeState((current) => {
        const stored = getStoredMode();
        if (stored) {
          return stored;
        }
        return event.matches ? 'dark' : 'light';
      });
    };
    if (initialMode === 'system') {
      media.addEventListener('change', handler);
    }
    return () => {
      if (initialMode === 'system') {
        media.removeEventListener('change', handler);
      }
    };
  }, [initialMode]);

  const setMode = useCallback((next: AuroraMode) => {
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((previous) => (previous === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo<AuroraThemeContextValue>(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

  return <AuroraThemeContext.Provider value={value}>{children}</AuroraThemeContext.Provider>;
}

export const useAuroraTheme = () => {
  const context = useContext(AuroraThemeContext);
  if (!context) {
    throw new Error('useAuroraTheme must be used within an AuroraThemeProvider');
  }
  return context;
};
