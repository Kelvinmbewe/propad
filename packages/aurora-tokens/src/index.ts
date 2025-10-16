import tokens from '../tokens.json';

type ColorScale = Record<string, string>;

type AuroraTokens = {
  colors: ColorScale;
  radii: Record<string, string>;
  spacing: Record<string, string>;
  typography: {
    fontFamily: string;
    headingWeight: number;
    bodyWeight: number;
  };
};

type AuroraTheme = {
  name: 'light' | 'dark';
  colors: {
    background: string;
    foreground: string;
    surface: string;
    border: string;
    primary: string;
    primaryAccent: string;
    textPrimary: string;
    textSecondary: string;
    textInverse: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  motionEnabled: boolean;
};

const baseTokens = tokens as AuroraTokens;

export const tokens: AuroraTokens = baseTokens;

export const lightTheme: AuroraTheme = {
  name: 'light',
  motionEnabled: true,
  colors: {
    background: baseTokens.colors.surfaceLight,
    surface: '#FFFFFF',
    foreground: '#0B1120',
    border: '#D0D8E8',
    primary: baseTokens.colors.primary,
    primaryAccent: baseTokens.colors.primaryAccent,
    textPrimary: baseTokens.colors.textPrimary,
    textSecondary: '#475569',
    textInverse: baseTokens.colors.textInverse,
    success: baseTokens.colors.success,
    warning: baseTokens.colors.warning,
    danger: baseTokens.colors.danger,
    info: baseTokens.colors.info,
  },
};

export const darkTheme: AuroraTheme = {
  name: 'dark',
  motionEnabled: true,
  colors: {
    background: baseTokens.colors.surfaceDark,
    surface: '#14213D',
    foreground: '#E2E8F0',
    border: '#1E293B',
    primary: baseTokens.colors.primaryAccent,
    primaryAccent: baseTokens.colors.primary,
    textPrimary: '#E2E8F0',
    textSecondary: '#94A3B8',
    textInverse: '#0F172A',
    success: '#4ADE80',
    warning: '#FACC15',
    danger: '#F87171',
    info: '#38BDF8',
  },
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type { AuroraTokens, AuroraTheme, DeepPartial };
