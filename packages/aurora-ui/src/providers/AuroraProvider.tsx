'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  tokens as baseTokens,
  lightTheme as baseLight,
  darkTheme as baseDark,
  AuroraTheme,
  DeepPartial,
} from '@aurora/tokens';

type AuroraProviderProps = {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  tokensOverride?: DeepPartial<typeof baseTokens>;
  motionEnabled?: boolean;
  persistKey?: string;
};

type AuroraContextValue = {
  tokens: typeof baseTokens;
  theme: AuroraTheme;
  setTheme: (value: 'light' | 'dark') => void;
  motionEnabled: boolean;
};

const AuroraContext = createContext<AuroraContextValue | undefined>(undefined);

const globalStyles = `
:root {
  --aurora-radius: 12px;
}

@keyframes aurora-shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes aurora-ripple {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

[data-theme='dark'] {
  color-scheme: dark;
}

.aurora-focus-ring:focus-visible {
  outline: 2px solid var(--aurora-focus-color, #38bdf8);
  outline-offset: 2px;
}
`;

const mergeTokens = (override?: DeepPartial<typeof baseTokens>) => {
  if (!override) return baseTokens;
  return {
    ...baseTokens,
    ...override,
    colors: {
      ...baseTokens.colors,
      ...override?.colors,
    },
    spacing: {
      ...baseTokens.spacing,
      ...override?.spacing,
    },
    radii: {
      ...baseTokens.radii,
      ...override?.radii,
    },
    typography: {
      ...baseTokens.typography,
      ...override?.typography,
    },
  } as typeof baseTokens;
};

const STORAGE_KEY = 'aurora:theme';

export const AuroraProvider: React.FC<AuroraProviderProps> = ({
  children,
  theme,
  tokensOverride,
  motionEnabled,
  persistKey = STORAGE_KEY,
}) => {
  const mergedTokens = useMemo(() => mergeTokens(tokensOverride), [tokensOverride]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return theme ?? baseLight.name;
    }
    const stored = window.localStorage.getItem(persistKey);
    return (stored as 'light' | 'dark') ?? theme ?? baseLight.name;
  });

  useEffect(() => {
    if (theme && theme !== currentTheme) {
      setCurrentTheme(theme);
    }
  }, [theme, currentTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(persistKey, currentTheme);
    const html = window.document.documentElement;
    html.dataset.theme = currentTheme;
    html.style.setProperty('--aurora-primary', mergedTokens.colors.primary);
    html.style.setProperty('--aurora-primary-accent', mergedTokens.colors.primaryAccent);
  }, [currentTheme, mergedTokens, persistKey]);

  const themeValue: AuroraTheme = useMemo(() => {
    const resolved = currentTheme === 'dark' ? baseDark : baseLight;
    return {
      ...resolved,
      motionEnabled: motionEnabled ?? resolved.motionEnabled,
    };
  }, [currentTheme, motionEnabled]);

  const value = useMemo<AuroraContextValue>(
    () => ({
      tokens: mergedTokens,
      theme: themeValue,
      setTheme: setCurrentTheme,
      motionEnabled: themeValue.motionEnabled,
    }),
    [mergedTokens, themeValue]
  );

  return (
    <AuroraContext.Provider value={value}>
      <style>{globalStyles}</style>
      {children}
    </AuroraContext.Provider>
  );
};

export const useAurora = () => {
  const ctx = useContext(AuroraContext);
  if (!ctx) {
    throw new Error('useAurora must be used within AuroraProvider');
  }
  return ctx;
};
