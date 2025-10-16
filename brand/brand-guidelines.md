# Aurora Theme Framework — Brand Guidelines

## Logomark & Logotype
- The Aurora logomark features rounded corners at 12% radius with a diagonal gradient at **135°** from teal `#009688` to indigo `#2B6CB0`.
- Maintain clear space equal to the height of the aurora wave around the mark and wordmark. Minimum digital size: 24 px for the logomark, 120 px width for the logotype.
- Gradient rotation tolerance is ±15°. Do not rotate past 120° or 150°.

## Colour Palette
- Primary gradient: `#009688 → #2B6CB0`
- Surface: `#0F172A` (dark), `#F8FAFC` (light)
- Accents: `#7DD3FC`, `#94A3B8`, `#F97316`
- Use monochrome options (white or #0F172A) on complex backgrounds.

## Typography
- Wordmark set in **Inter SemiBold** with tight kerning (-1%). Use Inter or system sans-serif stack for product UI.

## Usage Rules
- Do not skew, recolour, or apply drop shadows that conflict with the gradient.
- Avoid placing the brand over low-contrast photography. Ensure AA contrast is met.
- For monochrome use, fill the wave at 16% opacity relative to the base.

## Motion
- Animated stroke reveal duration: 1.2 s ease-in-out.
- Disable animation when `prefers-reduced-motion` is respected.

## Iconography
- App icons supplied in 48–512 px. Maintain rounded-rectangle container and gradient.
- Favicon derived from the logomark without wave overlay for legibility.

## Layout & Spacing
- Minimum padding: 16 px on mobile, 24 px on desktop.
- Align wordmark and mark vertically, never baseline misaligned.

## Colour Misuse
- Never invert gradient direction.
- Do not combine with neon, grayscale, or clashing palettes.
- Avoid using gradients under 90° or over 150° to maintain aurora flow.

## Social Share Artwork
- Source artwork lives in `social-share.svg` to keep the repo binary-free. Export 1200 × 630 PNGs for platforms that require raster assets using the `pnpm run build:og` helper (invokes `scripts/render-social-share.mjs`).
- Maintain the 12% corner radius and 135° gradient direction. Update the copy only within the safe area (36 px inset).
