# Aurora Theme Reference

The Aurora design system powers every PropAd surface across marketing, listings, and admin tooling. This reference explains
how Tailwind, shadcn/ui primitives, and design tokens connect so teams can ship consistently accessible experiences.

## Token architecture

Aurora exposes two layers of tokens:

1. **Base scales** – raw colour ramps, typography, spacing, and radii shared by light and dark themes. Example: `--aurora-color-primary-500`.
2. **Semantic roles** – mapped variables that reflect UI intent. Example: `--aurora-color-background` or `--aurora-color-accent-on`.

The Tailwind preset (`auroraTailwindPreset`) bridges these tokens into utility classes (`bg-aurora-background`, `text-aurora-text-muted`,
`bg-primary-500`, etc.) while also enabling gradients, animations, shadows, and spacing scales.

### Core semantic variables

| Token | Light value | Dark value | Usage |
|-------|-------------|------------|-------|
| `--aurora-color-background` | `#fafafa` | `#0d253f` | App body backgrounds, full-bleed panels |
| `--aurora-color-elevated` | `#ffffff` | `#132f54` | Cards, modals, nav shells |
| `--aurora-color-text` | `#1f2937` | `#f5f7fa` | Primary typography |
| `--aurora-color-text-muted` | `#4a5568` | `#cbd5e0` | Secondary copy, helper text |
| `--aurora-color-primary` | `#009688` | `#4fd1c5` | Primary actions, focus states |
| `--aurora-color-secondary` | `#2b6cb0` | `#90cdf4` | Navigation, complementary accents |
| `--aurora-color-accent` | `#ff6f61` | `#fc8181` | Highlights, celebratory UI |
| `--aurora-color-success` | `#68d391` | `#68d391` | Positive states and metrics |
| `--aurora-color-warning` | `#fbd38d` | `#fbd38d` | Caution states |
| `--aurora-color-info` | `#9f7aea` | `#9f7aea` | Neutral informational banners |

Shadows (`--aurora-shadow-soft`, `--aurora-shadow-bold`, `--aurora-shadow-focus`) and typography (`--aurora-font-sans`,
`--aurora-font-display`, `--aurora-font-numeric`) are also exposed so components stay legible across modes.

## Tailwind + shadcn/ui integration

- `packages/ui/src/theme/aurora-tailwind.ts` publishes a Tailwind preset that merges Aurora tokens with Tailwind utilities.
  - Enables class names such as `bg-primary-500`, `border-aurora-border`, `shadow-aurora`, and animations like `animate-aurora-fade-up`.
  - Dark mode is powered by either the `dark` class or `[data-aurora-mode="dark"]` attribute for flexibility.
- `@propad/ui` re-exports the preset, theme provider, and shadcn/ui primitives wired to the Aurora variables, ensuring consistent
typography, spacing, and focus treatments.
- `apps/web/tailwind.config.ts` consumes the preset and extends only what is necessary (font families), keeping configuration minimal.

## Theme provider behaviour

`AuroraThemeProvider` controls runtime theming by:

- Reading the stored preference from `localStorage` (`aurora-theme-mode`) or the system preference on first load.
- Applying all CSS variables to `document.documentElement`, toggling `aurora-light`, `aurora-dark`, and `dark` classes, and syncing the
  browser `color-scheme` attribute for native UI contrast.
- Persisting user changes and listening to system `prefers-color-scheme` updates when set to “system”.

Use the `AuroraThemeToggle` component anywhere in the app to switch themes. It consumes the same context and updates globally in one click.

## Practical usage

- **Tailwind utilities**: Compose UI with semantic colour classes (`bg-aurora-elevated`, `text-aurora-text-subtle`) or raw ramps (`bg-primary-400`).
- **shadcn/ui primitives**: Buttons, cards, inputs, labels, skeletons, and toasts already consume Aurora tokens. Override styles with Tailwind
  classes if needed; tokens guarantee contrast in either theme.
- **Gradients & charts**: Use `bg-aurora-gradient`, `bg-aurora-panorama`, or chart variables (`--aurora-chart-primary` etc.) for consistent data
  visualisation colours.

## Customizing the palette

You can supply your own semantic overrides while keeping the base scales intact:

```tsx
<AuroraThemeProvider initialMode="system">
  <style jsx global>{`
    :root {
      --aurora-color-primary: #006d77;
      --aurora-color-primary-on: #ffffff;
      --aurora-gradient-accent: linear-gradient(135deg, #006d77 0%, #83c5be 50%, #ffddd2 100%);
    }
  `}</style>
  <App />
</AuroraThemeProvider>
```

For larger brand shifts, fork `packages/ui/src/theme/aurora-tokens.ts` and update `auroraSemanticTokens`. The Tailwind preset will automatically
reflect the changes without further configuration.

## Accessibility checklist

- Aurora tokens target 4.5:1 contrast or better for text/background pairings across both themes.
- Motion easing variables (`ease-aurora-smooth`, `ease-aurora-spring`) keep animations gentle and can be swapped or disabled globally.
- Shadows remain subtle in light mode and more diffused in dark mode to avoid glare.

Following this guide ensures the PropAd experience remains cohesive, responsive, and delightful—no matter which team builds the next feature.
