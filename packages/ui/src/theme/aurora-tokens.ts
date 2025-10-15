export type AuroraMode = 'light' | 'dark';

type Scale<T extends string> = Record<T, string>;

type ColorScale = Scale<'50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'>;

type AuroraBaseTokens = {
  colors: {
    neutral: ColorScale;
    primary: ColorScale;
    secondary: ColorScale;
    accent: ColorScale;
    success: ColorScale;
    warning: ColorScale;
    danger: ColorScale;
    info: ColorScale;
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
      '50': '#f7fafc',
      '100': '#edf2f7',
      '200': '#e2e8f0',
      '300': '#cbd5e0',
      '400': '#a0aec0',
      '500': '#718096',
      '600': '#4a5568',
      '700': '#2d3748',
      '800': '#1f2937',
      '900': '#1a202c'
    },
    primary: {
      '50': '#e0f2f1',
      '100': '#b2dfdb',
      '200': '#80cbc4',
      '300': '#4db6ac',
      '400': '#26a69a',
      '500': '#009688',
      '600': '#00897b',
      '700': '#00796b',
      '800': '#00695c',
      '900': '#004d40'
    },
    secondary: {
      '50': '#ebf5ff',
      '100': '#cfe0ff',
      '200': '#a3c8ff',
      '300': '#7aaef5',
      '400': '#4d8fdd',
      '500': '#2b6cb0',
      '600': '#265d99',
      '700': '#1f4c7d',
      '800': '#183b61',
      '900': '#102745'
    },
    accent: {
      '50': '#ffe9e6',
      '100': '#ffccc5',
      '200': '#ffada3',
      '300': '#ff8f82',
      '400': '#ff7a6c',
      '500': '#ff6f61',
      '600': '#e66259',
      '700': '#cc554f',
      '800': '#b34746',
      '900': '#8a3433'
    },
    success: {
      '50': '#f0fff4',
      '100': '#dcfee8',
      '200': '#bdfad5',
      '300': '#92f0b9',
      '400': '#6fe6a1',
      '500': '#68d391',
      '600': '#47b371',
      '700': '#2e9357',
      '800': '#1d7744',
      '900': '#115c32'
    },
    warning: {
      '50': '#fff8eb',
      '100': '#ffe9c3',
      '200': '#ffda9a',
      '300': '#fec978',
      '400': '#fdc15f',
      '500': '#fbd38d',
      '600': '#e1b16a',
      '700': '#c7974f',
      '800': '#a87a3a',
      '900': '#7c5523'
    },
    danger: {
      '50': '#fef2f2',
      '100': '#fee2e2',
      '200': '#fecaca',
      '300': '#fca5a5',
      '400': '#f87171',
      '500': '#f56565',
      '600': '#e25555',
      '700': '#c54141',
      '800': '#a23232',
      '900': '#7f2323'
    },
    info: {
      '50': '#f5f0ff',
      '100': '#e8dcff',
      '200': '#d4c1ff',
      '300': '#bfa6ff',
      '400': '#a989ff',
      '500': '#9f7aea',
      '600': '#8662d2',
      '700': '#6d4ab4',
      '800': '#553595',
      '900': '#3d2571'
    }
  },
  typography: {
    fontFamily: {
      sans: "'Inter', 'Poppins', 'system-ui', sans-serif",
      display: "'Inter', 'Poppins', 'system-ui', sans-serif"
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
      snug: '1.2',
      relaxed: '1.6',
      dense: '1.1',
      loose: '1.8'
    }
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '0.875rem',
    xl: '0.95rem',
    '2xl': '1rem',
    pill: '9999px'
  },
  shadow: {
    soft: '0 1px 2px rgba(15, 23, 42, 0.05)',
    medium: '0 4px 6px rgba(15, 23, 42, 0.08)',
    bold: '0 10px 15px rgba(15, 23, 42, 0.12)',
    focus: '0 0 0 4px rgba(43, 108, 176, 0.35)'
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
  primary: string;
  primaryOn: string;
  secondary: string;
  secondaryOn: string;
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
    background: '#fafafa',
    elevated: '#ffffff',
    highest: '#f5f7fa',
    overlay: 'rgba(31, 41, 55, 0.55)',
    border: 'rgba(31, 41, 55, 0.12)',
    input: 'rgba(31, 41, 55, 0.06)',
    text: '#1f2937',
    textMuted: '#4a5568',
    textSubtle: '#718096',
    primary: '#009688',
    primaryOn: '#ffffff',
    secondary: '#2b6cb0',
    secondaryOn: '#ffffff',
    accent: '#ff6f61',
    accentStrong: '#e66259',
    accentGradient: 'linear-gradient(135deg, #009688 0%, #2b6cb0 50%, #ff6f61 100%)',
    accentOn: '#ffffff',
    critical: '#f56565',
    warning: '#fbd38d',
    success: '#68d391',
    info: '#9f7aea',
    glass: 'rgba(255, 255, 255, 0.7)',
    chart: {
      primary: '#009688',
      secondary: '#2b6cb0',
      tertiary: '#ff6f61',
      quaternary: '#9f7aea'
    }
  },
  dark: {
    background: '#0d253f',
    elevated: '#132f54',
    highest: '#1a3f6f',
    overlay: 'rgba(12, 30, 55, 0.75)',
    border: 'rgba(144, 205, 244, 0.25)',
    input: 'rgba(203, 213, 224, 0.14)',
    text: '#f5f7fa',
    textMuted: '#cbd5e0',
    textSubtle: '#a0b3d4',
    primary: '#4fd1c5',
    primaryOn: '#0d253f',
    secondary: '#90cdf4',
    secondaryOn: '#0d253f',
    accent: '#fc8181',
    accentStrong: '#f9736a',
    accentGradient: 'linear-gradient(135deg, #4fd1c5 0%, #90cdf4 50%, #fc8181 100%)',
    accentOn: '#0d253f',
    critical: '#fc8181',
    warning: '#fbd38d',
    success: '#68d391',
    info: '#9f7aea',
    glass: 'rgba(19, 47, 84, 0.65)',
    chart: {
      primary: '#4fd1c5',
      secondary: '#90cdf4',
      tertiary: '#fc8181',
      quaternary: '#9f7aea'
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
  const baseColorVariables = Object.entries(auroraBaseTokens.colors).reduce<Record<string, string>>(
    (acc, [name, scale]) => {
      Object.entries(scale).forEach(([grade, value]) => {
        acc[`--aurora-color-${name}-${grade}`] = value;
      });
      return acc;
    },
    {}
  );

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
    '--aurora-color-primary': palette.primary,
    '--aurora-color-primary-on': palette.primaryOn,
    '--aurora-color-secondary': palette.secondary,
    '--aurora-color-secondary-on': palette.secondaryOn,
    '--aurora-color-accent': palette.accent,
    '--aurora-color-accent-strong': palette.accentStrong,
    '--aurora-gradient-accent': palette.accentGradient,
    '--aurora-color-accent-on': palette.accentOn,
    '--aurora-color-critical': palette.critical,
    '--aurora-color-danger': palette.critical,
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
    '--aurora-shadow-focus': auroraBaseTokens.shadow.focus,
    '--color-bg': palette.background,
    '--color-card': palette.elevated,
    '--color-text-primary': palette.text,
    '--color-text-secondary': palette.textMuted,
    '--color-primary': palette.primary,
    '--color-secondary': palette.secondary,
    '--color-accent': palette.accent,
    '--color-success': auroraBaseTokens.colors.success['500'],
    '--color-warning': auroraBaseTokens.colors.warning['500'],
    '--color-danger': auroraBaseTokens.colors.danger['500'],
    '--color-info': auroraBaseTokens.colors.info['500'],
    '--aurora-font-numeric': 'tabular-nums',
    ...baseColorVariables
  } as Record<string, string>;
};

export const auroraGradientBackground = `radial-gradient(120% 140% at 10% 20%, rgba(0, 150, 136, 0.22), transparent 60%), radial-gradient(80% 120% at 90% 10%, rgba(43, 108, 176, 0.25), transparent 60%), radial-gradient(90% 90% at 50% 90%, rgba(255, 111, 97, 0.24), transparent 65%)`;
