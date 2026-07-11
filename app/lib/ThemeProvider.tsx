/**
 * Theme Provider for WWLO PRM — "Dual Personality" Framework.
 *
 * Reads the system color scheme preference and allows the user
 * to override it via Settings → Appearance → Theme.
 *
 * Exposes:
 *   useColors()  → reactive ColorPalette (light or dark)
 *   useTheme()   → full context (preference, resolved mode, setter, typography)
 */
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { DarkColors, LightColors, type ColorPalette, type ThemeMode } from '@/constants/Colors';

export type ThemePreference = 'system' | 'light' | 'dark';

/** Theme-aware typography tokens following the Type-Shift strategy. */
export interface ThemeTypography {
  /** Display / large headlines */
  displayFont: string;
  displayWeight: string;
  /** Body text */
  bodyFont: string;
  bodyWeight: string;
  /** System elements (labels, buttons, metadata) — same in both modes */
  systemFont: string;
  /** Monospace for code / editor */
  monoFont: string;
}

const LightTypography: ThemeTypography = {
  displayFont: 'Newsreader',
  displayWeight: '600',
  bodyFont: 'Literata',
  bodyWeight: '400',
  systemFont: 'Geist',
  monoFont: 'SpaceMono',
};

const DarkTypography: ThemeTypography = {
  displayFont: 'Geist',
  displayWeight: '700',
  bodyFont: 'Geist',
  bodyWeight: '400',
  systemFont: 'Geist',
  monoFont: 'SpaceMono',
};

interface ThemeContextValue {
  /** The user's preference: system, light, or dark */
  preference: ThemePreference;
  /** The resolved mode after applying system preference */
  resolvedTheme: ThemeMode;
  /** The active color palette */
  colors: ColorPalette;
  /** Theme-aware typography tokens */
  typography: ThemeTypography;
  /** Update the theme preference */
  setPreference: (pref: ThemePreference) => void;
}

const STORAGE_KEY = 'prm_theme_preference';

function loadPreference(): ThemePreference {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    }
  } catch { /* ignore */ }
  return 'system';
}

function savePreference(pref: ThemePreference): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, pref);
    }
  } catch { /* ignore */ }
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  resolvedTheme: 'dark',
  colors: DarkColors,
  typography: DarkTypography,
  setPreference: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreferenceState] = useState<ThemePreference>(loadPreference);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    savePreference(pref);
  }, []);

  const resolvedTheme: ThemeMode = useMemo(() => {
    if (preference === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return preference;
  }, [preference, systemScheme]);

  const colors = useMemo(() => {
    return resolvedTheme === 'light' ? LightColors : DarkColors;
  }, [resolvedTheme]);

  const typography = useMemo(() => {
    return resolvedTheme === 'light' ? LightTypography : DarkTypography;
  }, [resolvedTheme]);

  const value = useMemo(() => ({
    preference,
    resolvedTheme,
    colors,
    typography,
    setPreference,
  }), [preference, resolvedTheme, colors, typography, setPreference]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Returns the active color palette based on the resolved theme.
 */
export function useColors(): ColorPalette {
  return useContext(ThemeContext).colors;
}

/**
 * Returns the full theme context including preference, setter, and typography.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
