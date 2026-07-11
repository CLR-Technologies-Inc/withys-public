/**
 * WWLO PRM Design System Colors
 *
 * Dual-personality framework:
 *  - Light ("Narrative"):  Digital Stationery, serif typography, Willow Green accents
 *  - Dark  ("Technical"):  Focus & Precision, sans-serif, Deep Blue accents
 *
 * Surface tokens aligned with Material Design 3 neutral-variant scale
 * sourced from the WWLO Design Journal (design.md).
 */

export type ThemeMode = 'light' | 'dark';

export interface ColorPalette {
  // Core palette
  background: string;
  primaryAccent: string;
  secondaryAccent: string;
  willowGreen: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Text-on-colored-surface tokens (buttons, badges, status chips)
  textOnPrimary: string;     // text on primaryAccent / willowGreen bg
  textOnSecondary: string;   // text on secondaryAccent bg
  textOnSuccess: string;     // text on success bg
  textOnDanger: string;      // text on danger bg

  // Surfaces  (M3-aligned tonal scale)
  surface: string;
  surfaceDim: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceCard: string;     // convenience alias
  surfaceHover: string;
  surfaceActive: string;

  // Borders
  outline: string;
  outlineVariant: string;
  border: string;          // convenience alias
  borderSubtle: string;

  // Syntax highlighting (journal editor)
  syntaxDate: string;
  syntaxContact: string;
  syntaxPosting: string;
  syntaxTag: string;
  syntaxComment: string;

  // Status
  success: string;
  warning: string;
  danger: string;

  // Vault / Encryption
  vaultAccent: string;
  vaultSurface: string;
  vaultBorder: string;

  // Extended palette
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  tertiary: string;
  onTertiary: string;
}

/* ─── Dark Mode: "Technical" ─────────────────────────────────────────────── */

export const DarkColors: ColorPalette = {
  background: '#000000',
  primaryAccent: '#0F4D92',
  secondaryAccent: '#B9D9EB',
  willowGreen: '#637C5B',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  textOnSuccess: '#FFFFFF',
  textOnDanger: '#FFFFFF',

  // Surfaces — dark-mode tonal scale
  surface: '#000000',
  surfaceDim: '#0A0A0A',
  surfaceContainerLowest: '#050505',
  surfaceContainerLow: '#0D0D0D',
  surfaceContainer: '#121212',
  surfaceContainerHigh: '#1A1A1A',
  surfaceContainerHighest: '#222222',
  onSurface: '#FFFFFF',
  onSurfaceVariant: 'rgba(255, 255, 255, 0.7)',
  surfaceCard: 'rgba(15, 77, 146, 0.12)',
  surfaceHover: 'rgba(15, 77, 146, 0.20)',
  surfaceActive: '#0F4D92',

  // Borders — ghost borders
  outline: 'rgba(15, 77, 146, 0.35)',
  outlineVariant: 'rgba(15, 77, 146, 0.18)',
  border: 'rgba(15, 77, 146, 0.35)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',

  // Syntax
  syntaxDate: '#B9D9EB',
  syntaxContact: '#FFFFFF',
  syntaxPosting: '#B9D9EB',
  syntaxTag: '#0F4D92',
  syntaxComment: 'rgba(255, 255, 255, 0.5)',

  // Status
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',

  // Vault
  vaultAccent: '#F59E0B',
  vaultSurface: 'rgba(245, 158, 11, 0.10)',
  vaultBorder: 'rgba(245, 158, 11, 0.35)',

  // Extended
  inverseSurface: '#2F3130',
  inverseOnSurface: '#F1F1F0',
  inversePrimary: '#B3CEA8',
  tertiary: '#426070',
  onTertiary: '#FFFFFF',
};

/* ─── Light Mode: "Narrative" ────────────────────────────────────────────── */

export const LightColors: ColorPalette = {
  background: '#FAFAF9',
  primaryAccent: '#4B6344',
  secondaryAccent: '#2A5EA4',
  willowGreen: '#637C5B',
  textPrimary: '#1A1C1C',
  textSecondary: '#434840',
  textMuted: '#74796F',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  textOnSuccess: '#FFFFFF',
  textOnDanger: '#FFFFFF',

  // Surfaces — M3 neutral tonal scale from design.md
  surface: '#F9F9F8',
  surfaceDim: '#DADAD9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F4F3',
  surfaceContainer: '#EEEEED',
  surfaceContainerHigh: '#E8E8E7',
  surfaceContainerHighest: '#E2E2E2',
  onSurface: '#1A1C1C',
  onSurfaceVariant: '#434840',
  surfaceCard: '#FFFFFF',
  surfaceHover: 'rgba(75, 99, 68, 0.06)',
  surfaceActive: '#637C5B',

  // Borders — soft tonal borders
  outline: '#74796F',
  outlineVariant: '#C4C8BD',
  border: '#C4C8BD',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',

  // Syntax
  syntaxDate: '#4B6344',
  syntaxContact: '#1A1C1C',
  syntaxPosting: '#637C5B',
  syntaxTag: '#2A5EA4',
  syntaxComment: '#74796F',

  // Status
  success: '#22C55E',
  warning: '#D97706',
  danger: '#BA1A1A',

  // Vault
  vaultAccent: '#D97706',
  vaultSurface: 'rgba(217, 119, 6, 0.06)',
  vaultBorder: 'rgba(217, 119, 6, 0.20)',

  // Extended (from design.md frontmatter)
  inverseSurface: '#2F3130',
  inverseOnSurface: '#F1F1F0',
  inversePrimary: '#B3CEA8',
  tertiary: '#426070',
  onTertiary: '#FFFFFF',
};

/**
 * Default Colors export — DarkColors for backward compatibility.
 * For reactive theme support, use the `useColors()` hook.
 */
export const Colors: ColorPalette = { ...DarkColors };

export default Colors;
