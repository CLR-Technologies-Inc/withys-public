---
name: WWLO - Journal Narrative & Technical
colors:
  surface: '#f9f9f8'
  surface-dim: '#dadad9'
  surface-bright: '#f9f9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f3'
  surface-container: '#eeeeed'
  surface-container-high: '#e8e8e7'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#434840'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1f0'
  outline: '#74796f'
  outline-variant: '#c4c8bd'
  surface-tint: '#4d6546'
  primary: '#4b6344'
  on-primary: '#ffffff'
  primary-container: '#637c5b'
  on-primary-container: '#fcfff5'
  inverse-primary: '#b3cea8'
  secondary: '#2a5ea4'
  on-secondary: '#ffffff'
  secondary-container: '#83b2fd'
  on-secondary-container: '#004384'
  tertiary: '#426070'
  on-tertiary: '#ffffff'
  tertiary-container: '#5b7989'
  on-tertiary-container: '#fcfdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfebc3'
  primary-fixed-dim: '#b3cea8'
  on-primary-fixed: '#0b2008'
  on-primary-fixed-variant: '#354d2f'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#a8c8ff'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#00468a'
  tertiary-fixed: '#c7e7fa'
  tertiary-fixed-dim: '#abcbdd'
  on-tertiary-fixed: '#001f2b'
  on-tertiary-fixed-variant: '#2c4b59'
  background: '#f9f9f8'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-md-dark:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Literata
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body-lg-dark:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  margin-mobile: 20px
  margin-desktop: 64px
  gutter: 16px
  container-max: 800px
---

# WWLO Design Journal

## Brand & Style

This design system is built on a dual-personality framework: **Editorial Narrative** for Light Mode and **Premium Technical** for Dark Mode. The goal is to provide a user experience that shifts from the warmth of a physical linen journal during the day to the focus of a high-end IDE at night.

- **Light Mode (Narrative):** Focuses on a "Digital Stationery" aesthetic. It prioritizes readability, calm, and a sense of timelessness using high-contrast serif headers and organic green accents.
- **Dark Mode (Technical):** Focuses on "Focus and Precision." It utilizes a deep black environment with high-precision sans-serif typography and technical blue highlights to evoke a sense of professional logging and data security.
- **Unified Logic:** Both modes share an underlying 8px grid, consistent component proportions, and a minimalist philosophy that keeps the user's content as the primary focus.

## Colors

The palette is bifurcated to support the dual-theme requirement.

- **Light Mode:** The "Willow" palette. Use `#637C5B` for primary actions (buttons, active states). The background is a soft, non-reflective off-white `#FAFAF9`. Text should maintain high contrast using a deep charcoal to ensure the editorial feel.
- **Dark Mode:** The "Deep Technical" palette. The background is absolute black `#000000` to maximize OLED efficiency and contrast. Deep Blue `#0F4D92` serves as the structural primary, while Soft Blue `#B9D9EB` is reserved for highlights, active indicators, and high-priority glyphs.

## Typography

This design system uses a "Type-Shift" strategy. When the user switches themes, the typeface families swap to reinforce the mood change.

- **Light Mode (Editorial):** Uses **Newsreader** for headlines and **Literata** for body text. This combination mimics the feel of a premium broadsheet or literary journal. Increase line-height slightly to allow the serif characters room to breathe.
- **Dark Mode (Technical):** Transitions entirely to **Geist**. This provides a sharp, monolinear, and utilitarian feel. Headlines should be slightly smaller and bolder than their light-mode counterparts to maintain a "monitored" aesthetic.
- **Universal:** **Geist** is used for all "system" elements (labels, metadata, buttons) in both modes to provide a consistent functional anchor.

## Layout & Spacing

The layout is content-centric, utilizing a **Fixed Grid** for the primary writing area to mimic the width of a page or a terminal window.

- **Writing Area:** Capped at `800px` to maintain optimal line lengths for reading and writing.
- **Rhythm:** An 8px linear scale governs all padding and margins.
- **Desktop:** A 12-column grid is used, but for the journaling experience, the center 8 columns are prioritized for text, with the outer columns reserved for metadata (dates, tags, mood trackers).
- **Mobile:** A single-column layout with `20px` side margins. The header should be sticky to allow quick access to save/exit actions.

## Elevation & Depth

Depth is handled differently in each mode to suit the visual narrative.

- **Light Mode (Tonal Layers):** Elevation is achieved through subtle tonal shifts and soft, wide-dispersion shadows. The primary surface is `#FAFAF9`, and elevated cards use a pure white `#FFFFFF` with a 2% Willow Green tint in the shadow to keep the palette organic.
- **Dark Mode (Outlines & Blurs):** In a pure black environment, shadows are ineffective. Instead, use "Ghost Borders"—thin, 1px strokes of `#0F4D92` at low opacity (15-20%). For floating elements (modals), use a subtle backdrop-blur (12px) to suggest glass sitting over the black void.

## Shapes

The design system adopts a **Soft** (0.25rem/4px) corner strategy to maintain a balance between organic and technical.

- **Inputs and Buttons:** Use the standard 4px radius.
- **Cards/Containers:** Use `rounded-lg` (8px) for a modern feel.
- **Mode-Specific Treatment:** In Light Mode, borders should feel softer and thinner. In Dark Mode, borders can be slightly more pronounced to define the boundaries of the "Technical" blocks against the black background.

## Components

### Buttons

- **Primary (Light):** Solid Willow Green `#637C5B` with white text. Newsreader Medium for the label.
- **Primary (Dark):** Solid Deep Blue `#0F4D92` with white text. Geist Bold for the label, uppercase.
- **Secondary:** Transparent background with a thin stroke and monochromatic text.

### Cards

- **Journal Entry Card:** In Light Mode, use a simple bottom-border separation. In Dark Mode, use a contained card with a subtle dark-grey fill (`#121212`) and a blue-tinted border.

### Input Fields

- **Writing Area:** No borders or boxes. A simple, blinking cursor. In Dark Mode, the cursor should be the Soft Blue highlight color.
- **Metadata Inputs:** Underlined only in Light Mode; fully boxed with a subtle inner-glow in Dark Mode.

### Additional Components

- **Mood Tracker:** Small, circular chips. In Light Mode, use desaturated earthy tones. In Dark Mode, use vibrant, neon-tinted icons.
- **Timeline/Gutter:** A vertical line on the left-hand side. In Light Mode, it looks like a notebook margin. In Dark Mode, it looks like a code-editor line-number gutter.
