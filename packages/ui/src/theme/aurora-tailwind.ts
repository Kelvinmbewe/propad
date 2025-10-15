import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import { auroraBaseTokens } from './aurora-tokens';

type AuroraTailwindOptions = {
  cssVariablePrefix?: string;
};

const createCssVar = (token: string, prefix: string) => `var(--${prefix}${token})`;

export const auroraTailwindPreset = ({ cssVariablePrefix = 'aurora-' }: AuroraTailwindOptions = {}): Config => {
  const css = (token: string) => createCssVar(token, cssVariablePrefix);
  const colors = {
    background: css('color-background'),
    surface: css('color-elevated'),
    surfaceHigh: css('color-highest'),
    border: css('color-border'),
    input: css('color-input'),
    text: css('color-text'),
    muted: css('color-text-muted'),
    subtle: css('color-text-subtle'),
    primary: css('color-primary'),
    primaryOn: css('color-primary-on'),
    secondary: css('color-secondary'),
    secondaryOn: css('color-secondary-on'),
    accent: css('color-accent'),
    accentStrong: css('color-accent-strong'),
    accentOn: css('color-accent-on'),
    overlay: css('color-overlay'),
    success: css('color-success'),
    warning: css('color-warning'),
    info: css('color-info'),
    danger: css('color-critical')
  };

  return {
    darkMode: ['class', '[data-aurora-mode="dark"]'],
    theme: {
      extend: {
        colors: {
          aurora: colors,
          primary: {
            DEFAULT: colors.primary,
            on: colors.primaryOn,
            ...auroraBaseTokens.colors.primary
          },
          secondary: {
            DEFAULT: colors.secondary,
            on: colors.secondaryOn,
            ...auroraBaseTokens.colors.secondary
          },
          accent: {
            DEFAULT: colors.accent,
            strong: colors.accentStrong,
            on: colors.accentOn,
            ...auroraBaseTokens.colors.accent
          },
          neutral: auroraBaseTokens.colors.neutral,
          success: auroraBaseTokens.colors.success,
          warning: auroraBaseTokens.colors.warning,
          danger: auroraBaseTokens.colors.danger,
          info: auroraBaseTokens.colors.info
        },
        borderRadius: {
          '2xl': auroraBaseTokens.radius['2xl'],
          '3xl': '2.5rem'
        },
        fontFamily: {
          sans: `var(--${cssVariablePrefix}font-sans, ${auroraBaseTokens.typography.fontFamily.sans})`,
          display: `var(--${cssVariablePrefix}font-display, ${auroraBaseTokens.typography.fontFamily.display})`
        },
        boxShadow: {
          aurora: css('shadow-soft'),
          auroraBold: css('shadow-bold'),
          auroraFocus: css('shadow-focus')
        },
        backgroundImage: {
          'aurora-gradient': css('gradient-accent'),
          'aurora-panorama': `var(--${cssVariablePrefix}gradient-panorama, ${css('gradient-accent')})`,
          'aurora-panorama-secondary': `var(--${cssVariablePrefix}gradient-panorama-secondary, ${css('gradient-accent')})`,
          'aurora-panorama-tertiary': `var(--${cssVariablePrefix}gradient-panorama-tertiary, ${css('gradient-accent')})`
        },
        spacing: auroraBaseTokens.spacing,
        transitionTimingFunction: {
          'aurora-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          'aurora-smooth': 'cubic-bezier(0.22, 1, 0.36, 1)'
        },
        keyframes: {
          'aurora-fade-up': {
            '0%': { opacity: '0', transform: 'translateY(24px) scale(0.98)' },
            '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
          },
          'aurora-pulse': {
            '0%, 100%': { opacity: '0.6' },
            '50%': { opacity: '1' }
          }
        },
        animation: {
          'aurora-fade-up': 'aurora-fade-up 450ms var(--aurora-motion-ease, cubic-bezier(0.34, 1.56, 0.64, 1)) both',
          'aurora-pulse': 'aurora-pulse 2s ease-in-out infinite'
        }
      }
    },
    plugins: [
      plugin(({ addBase }) => {
        addBase({
          ':root': {
            '--aurora-gradient-panorama': `radial-gradient(120% 140% at 10% 20%, rgba(0, 150, 136, 0.22), transparent 60%)`,
            '--aurora-gradient-panorama-secondary': `radial-gradient(80% 120% at 90% 10%, rgba(43, 108, 176, 0.25), transparent 60%)`,
            '--aurora-gradient-panorama-tertiary': `radial-gradient(90% 90% at 50% 90%, rgba(255, 111, 97, 0.24), transparent 65%)`,
            '--aurora-motion-ease': 'cubic-bezier(0.22, 1, 0.36, 1)'
          }
        });
      })
    ]
  } satisfies Config;
};
