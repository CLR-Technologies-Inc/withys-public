/**
 * WWLO Design System — Foundational tokens beyond colors and typography.
 *
 * These map 1:1 to the design system's `colors_and_type.css` extensions:
 *   - Motion (easings + durations)
 *   - Z-index scale (never use raw numbers)
 *   - Opacity scale (for ghost borders, hovers, disabled, press)
 *   - Breakpoints (mobile / tablet / desktop / wide)
 *
 * Source of truth: wwlo-design-system project's colors_and_type.css.
 */

// ── Motion ──────────────────────────────────────────────────────────────────
// Bézier control points are usable directly with react-native-reanimated's
// `Easing.bezier(...)` and the web's `cubic-bezier(...)` CSS function.
export const Easing = {
  /** Default ease-out for screen pushes (Expo Router default). */
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  /** Material-style enter — decelerates into rest. */
  enter: [0, 0, 0.2, 1] as const,
  /** Material-style exit — accelerates away. */
  exit: [0.4, 0, 1, 1] as const,
} as const;

export const Duration = {
  /** Micro — hover, press. */
  1: 140,
  /** Default — tabs, accordion, toast in. */
  2: 220,
  /** Screen — modal in/out, sheet. */
  3: 320,
  /** Page transition. */
  4: 480,
} as const;

// ── Z-index scale ───────────────────────────────────────────────────────────
// Never use raw numbers in `zIndex` styles — pull from here.
export const ZIndex = {
  base: 0,
  /** Sticky headers, tab bar. */
  sticky: 10,
  /** Select menus, popovers. */
  dropdown: 20,
  /** Floating action buttons. */
  fab: 30,
  /** Modal backdrop, sheets. */
  overlay: 40,
  /** Modal content (just above backdrop). */
  modal: 41,
  /** Toast / snackbar. */
  toast: 60,
  /** Tooltip — top of stack. */
  tooltip: 70,
} as const;

// ── Opacity scale ───────────────────────────────────────────────────────────
// Used by ghost borders, hover washes, disabled controls, press states.
export const Opacity = {
  border: 0.12,
  hover: 0.2,
  ghostBorder: 0.35,
  /** Comment/secondary text inside dark cards. */
  secondary: 0.5,
  primary: 0.7,
  /** Expo `activeOpacity` default for Pressables. */
  press: 0.7,
  disabled: 0.4,
} as const;

// ── Breakpoints ─────────────────────────────────────────────────────────────
// Use with `Dimensions.get('window').width` or the `useResponsive` hook.
export const Breakpoint = {
  /** Small phones — single column. */
  sm: 480,
  /** Tablet — tab bar starts giving way to side rail. */
  md: 768,
  /** Desktop — multi-column reveals. */
  lg: 1024,
  /** Wide desktop — max layout width. */
  xl: 1440,
} as const;

export type Breakpoints = keyof typeof Breakpoint;
