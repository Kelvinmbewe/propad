import baseTokens from './tokens';
import type { Tokens } from './tokens';

export const tokens = baseTokens;
export type { Tokens } from './tokens';

export type TokenName = keyof Tokens;
export type TokenValue<TName extends TokenName = TokenName> = Tokens[TName];
export type AuroraTokens = Tokens;

export type AuroraTheme = {
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

export const lightTheme: AuroraTheme = {
  name: 'light',
  motionEnabled: true,
  colors: {
    background: tokens.colors.surfaceLight,
    surface: '#FFFFFF',
    foreground: '#0B1120',
    border: '#D0D8E8',
    primary: tokens.colors.primary,
    primaryAccent: tokens.colors.primaryAccent,
    textPrimary: tokens.colors.textPrimary,
    textSecondary: '#475569',
    textInverse: tokens.colors.textInverse,
    success: tokens.colors.success,
    warning: tokens.colors.warning,
    danger: tokens.colors.danger,
    info: tokens.colors.info,
  },
};

export const darkTheme: AuroraTheme = {
  name: 'dark',
  motionEnabled: true,
  colors: {
    background: tokens.colors.surfaceDark,
    surface: '#14213D',
    foreground: '#E2E8F0',
    border: '#1E293B',
    primary: tokens.colors.primaryAccent,
    primaryAccent: tokens.colors.primary,
    textPrimary: '#E2E8F0',
    textSecondary: '#94A3B8',
    textInverse: '#0F172A',
    success: '#4ADE80',
    warning: '#FACC15',
    danger: '#F87171',
    info: '#38BDF8',
  },
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
