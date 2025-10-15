export type AuroraMode = 'light' | 'dark';

type Scale<T extends string> = Record<T, string>;

type ColorScale = Scale<'50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'>;

type AuroraBaseTokens = {
  colors: {
    neutral: ColorScale;
    accent: ColorScale;
    fuchsia: ColorScale;
    teal: ColorScale;
    amber: ColorScale;
    error: ColorScale;
    success: ColorScale;
    warning: ColorScale;
  };
  typography: {
    fontFamily: {
      sans: string;
      display: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
      '5xl': string;
    };
    lineHeight: {
      snug: string;
      relaxed: string;
      dense: string;
      loose: string;
    };
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    pill: string;
  };
  shadow: {
    soft: string;
    medium: string;
    bold: string;
    focus: string;
  };
  spacing: {
    '3xs': string;
    '2xs': string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
};

export const auroraBaseTokens: AuroraBaseTokens = {
  colors: {
    neutral: {
      '50': '#f8fafc',
      '100': '#f1f5f9',
      '200': '#e2e8f0',
      '300': '#cbd5f5',
      '400': '#94a3b8',
      '500': '#64748b',
      '600': '#475569',
      '700': '#334155',
      '800': '#1e293b',
      '900': '#0f172a'
    },
    accent: {
      '50': '#f5f5ff',
      '100': '#eef2ff',
      '200': '#dbe7ff',
      '300': '#c3d7ff',
      '400': '#8ca3ff',
      '500': '#6278ff',
      '600': '#4b5cf2',
      '700': '#3d46d6',
      '800': '#3136ad',
      '900': '#252985'
    },
    fuchsia: {
      '50': '#fdf4ff',
      '100': '#fae8ff',
      '200': '#f5d0fe',
      '300': '#f0abfc',
      '400': '#e879f9',
      '500': '#d946ef',
      '600': '#c026d3',
      '700': '#a21caf',
      '800': '#86198f',
      '900': '#701a75'
    },
    teal: {
      '50': '#ecfeff',
      '100': '#cffafe',
      '200': '#a5f3fc',
      '300': '#67e8f9',
      '400': '#22d3ee',
      '500': '#0ea5e9',
      '600': '#0284c7',
      '700': '#0369a1',
      '800': '#075985',
      '900': '#0c4a6e'
    },
    amber: {
      '50': '#fffbeb',
      '100': '#fef3c7',
      '200': '#fde68a',
      '300': '#fcd34d',
      '400': '#fbbf24',
      '500': '#f59e0b',
      '600': '#d97706',
      '700': '#b45309',
      '800': '#92400e',
      '900': '#78350f'
    },
    error: {
      '50': '#fef2f2',
      '100': '#fee2e2',
      '200': '#fecaca',
      '300': '#fca5a5',
      '400': '#f87171',
      '500': '#ef4444',
      '600': '#dc2626',
      '700': '#b91c1c',
      '800': '#991b1b',
      '900': '#7f1d1d'
    },
    success: {
      '50': '#f0fdf4',
      '100': '#dcfce7',
      '200': '#bbf7d0',
      '300': '#86efac',
      '400': '#4ade80',
      '500': '#22c55e',
      '600': '#16a34a',
      '700': '#15803d',
      '800': '#166534',
      '900': '#14532d'
    },
    warning: {
      '50': '#fefce8',
      '100': '#fef3c7',
      '200': '#fde68a',
      '300': '#fcd34d',
      '400': '#fbbf24',
      '500': '#f59e0b',
      '600': '#d97706',
      '700': '#b45309',
      '800': '#92400e',
      '900': '#78350f'
    }
  },
  typography: {
    fontFamily: {
      sans: "'Inter', 'Plus Jakarta Sans', 'system-ui', sans-serif",
      display: "'Switzer', 'Inter', 'system-ui', sans-serif"
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem'
    },
    lineHeight: {
      snug: '1.25',
      relaxed: '1.5',
      dense: '1.15',
      loose: '1.7'
    }
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.75rem',
    pill: '9999px'
  },
  shadow: {
    soft: '0 12px 40px -24px rgba(79, 70, 229, 0.35)',
    medium: '0 24px 60px -20px rgba(15, 23, 42, 0.45)',
    bold: '0 24px 80px -10px rgba(15, 23, 42, 0.55)',
    focus: '0 0 0 4px rgba(98, 120, 255, 0.35)'
  },
  spacing: {
    '3xs': '0.25rem',
    '2xs': '0.5rem',
    xs: '0.75rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '2.5rem',
    '2xl': '3rem',
    '3xl': '4rem'
  }
};

export type AuroraSemanticPalette = {
  background: string;
  elevated: string;
  highest: string;
  overlay: string;
  border: string;
  input: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentStrong: string;
  accentGradient: string;
  accentOn: string;
  critical: string;
  warning: string;
  success: string;
  info: string;
  glass: string;
  chart: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
  };
};

export const auroraSemanticTokens: Record<AuroraMode, AuroraSemanticPalette> = {
  light: {
    background: '#f4f6fb',
    elevated: '#ffffff',
    highest: '#f8f9ff',
    overlay: 'rgba(15, 23, 42, 0.65)',
    border: 'rgba(99, 102, 241, 0.18)',
    input: 'rgba(15, 23, 42, 0.05)',
    text: '#0f172a',
    textMuted: '#475569',
    textSubtle: '#64748b',
    accent: '#4b5cf2',
    accentStrong: '#3d46d6',
    accentGradient: 'linear-gradient(135deg, #6278ff 0%, #22d3ee 45%, #f59e0b 100%)',
    accentOn: '#ffffff',
    critical: '#dc2626',
    warning: '#f59e0b',
    success: '#16a34a',
    info: '#0284c7',
    glass: 'rgba(255, 255, 255, 0.65)',
    chart: {
      primary: '#6278ff',
      secondary: '#22d3ee',
      tertiary: '#f59e0b',
      quaternary: '#d946ef'
    }
  },
  dark: {
    background: '#0b1120',
    elevated: '#111b2f',
    highest: '#16213f',
    overlay: 'rgba(3, 7, 18, 0.75)',
    border: 'rgba(99, 102, 241, 0.32)',
    input: 'rgba(148, 163, 184, 0.1)',
    text: '#e2e8f0',
    textMuted: '#cbd5f5',
    textSubtle: '#94a3b8',
    accent: '#8ca3ff',
    accentStrong: '#6278ff',
    accentGradient: 'linear-gradient(145deg, #3136ad 0%, #4b5cf2 40%, #22d3ee 75%, #f59e0b 100%)',
    accentOn: '#0f172a',
    critical: '#f87171',
    warning: '#fbbf24',
    success: '#4ade80',
    info: '#38bdf8',
    glass: 'rgba(17, 27, 47, 0.65)',
    chart: {
      primary: '#8ca3ff',
      secondary: '#22d3ee',
      tertiary: '#f59e0b',
      quaternary: '#f0abfc'
    }
  }
};

export type AuroraDesignTokens = AuroraBaseTokens & {
  semantic: typeof auroraSemanticTokens;
};

export const auroraTokens: AuroraDesignTokens = {
  ...auroraBaseTokens,
  semantic: auroraSemanticTokens
};

export const auroraCssVariables = (mode: AuroraMode) => {
  const palette = auroraSemanticTokens[mode];
  return {
    '--aurora-color-background': palette.background,
    '--aurora-color-elevated': palette.elevated,
    '--aurora-color-highest': palette.highest,
    '--aurora-color-overlay': palette.overlay,
    '--aurora-color-border': palette.border,
    '--aurora-color-input': palette.input,
    '--aurora-color-text': palette.text,
    '--aurora-color-text-muted': palette.textMuted,
    '--aurora-color-text-subtle': palette.textSubtle,
    '--aurora-color-accent': palette.accent,
    '--aurora-color-accent-strong': palette.accentStrong,
    '--aurora-gradient-accent': palette.accentGradient,
    '--aurora-color-accent-on': palette.accentOn,
    '--aurora-color-critical': palette.critical,
    '--aurora-color-warning': palette.warning,
    '--aurora-color-success': palette.success,
    '--aurora-color-info': palette.info,
    '--aurora-color-glass': palette.glass,
    '--aurora-chart-primary': palette.chart.primary,
    '--aurora-chart-secondary': palette.chart.secondary,
    '--aurora-chart-tertiary': palette.chart.tertiary,
    '--aurora-chart-quaternary': palette.chart.quaternary,
    '--aurora-font-sans': auroraBaseTokens.typography.fontFamily.sans,
    '--aurora-font-display': auroraBaseTokens.typography.fontFamily.display,
    '--aurora-radius-lg': auroraBaseTokens.radius.lg,
    '--aurora-radius-2xl': auroraBaseTokens.radius['2xl'],
    '--aurora-shadow-soft': auroraBaseTokens.shadow.soft,
    '--aurora-shadow-medium': auroraBaseTokens.shadow.medium,
    '--aurora-shadow-bold': auroraBaseTokens.shadow.bold,
    '--aurora-shadow-focus': auroraBaseTokens.shadow.focus
  } as Record<string, string>;
};

export const auroraGradientBackground = `radial-gradient(120% 140% at 10% 20%, rgba(98, 120, 255, 0.35), transparent 60%), radial-gradient(80% 120% at 90% 10%, rgba(34, 211, 238, 0.35), transparent 60%), radial-gradient(90% 90% at 50% 90%, rgba(245, 158, 11, 0.2), transparent 65%)`;
