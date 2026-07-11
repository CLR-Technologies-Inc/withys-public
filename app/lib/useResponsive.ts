/**
 * Responsive layout utility for WWLO PRM.
 *
 * Provides breakpoint-aware values and a centralized layout system that
 * adapts to mobile, tablet, and desktop screen sizes. Uses Dimensions
 * with an event listener so it reacts to window resizes and orientation
 * changes in real time.
 *
 * Breakpoints (logical px):
 *   Mobile   : < 640
 *   Tablet   : 640 – 1023
 *   Desktop  : >= 1024
 */

import { useState, useEffect, useMemo } from 'react';
import { Dimensions, ScaledSize, StyleSheet, Platform } from 'react-native';

// ── Breakpoints ──────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  /** Below this = mobile */
  tablet: 640,
  /** Above this = desktop */
  desktop: 1024,
  /** Wide desktop (content max-width) */
  wide: 1440,
} as const;

export type DeviceClass = 'mobile' | 'tablet' | 'desktop';

// ── Core hook ────────────────────────────────────────────────────────────────

export interface ResponsiveInfo {
  /** Current window width in logical px */
  width: number;
  /** Current window height in logical px */
  height: number;
  /** Resolved device class */
  device: DeviceClass;
  /** Shorthand booleans */
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Content padding (scales with viewport) */
  contentPadding: number;
  /** Max content width for centered layouts */
  maxContentWidth: number;
  /** Number of columns for grid layouts (2 on mobile, 3 on tablet, 4 on desktop) */
  gridColumns: number;
  /** Card min-width for flex grids */
  cardMinWidth: number;
  /** Font scale multiplier (1 on mobile, 1.05 on tablet, 1.1 on desktop) */
  fontScale: number;
}

export function useResponsive(): ResponsiveInfo {
  const [dims, setDims] = useState<ScaledSize>(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDims(window);
    });
    return () => sub.remove();
  }, []);

  return useMemo(() => {
    const { width, height } = dims;
    const device: DeviceClass =
      width >= BREAKPOINTS.desktop ? 'desktop' :
        width >= BREAKPOINTS.tablet ? 'tablet' :
          'mobile';

    const isMobile = device === 'mobile';
    const isTablet = device === 'tablet';
    const isDesktop = device === 'desktop';

    return {
      width,
      height,
      device,
      isMobile,
      isTablet,
      isDesktop,
      contentPadding: isMobile ? 16 : isTablet ? 24 : 32,
      maxContentWidth: isMobile ? width : isTablet ? 720 : 960,
      gridColumns: isMobile ? 2 : isTablet ? 3 : 4,
      cardMinWidth: isMobile ? 150 : 200,
      fontScale: isMobile ? 1 : isTablet ? 1.05 : 1.1,
    };
  }, [dims]);
}

// ── Responsive value helper ──────────────────────────────────────────────────

/**
 * Pick a value based on the current device class.
 * Usage: responsiveValue(info, { mobile: 16, tablet: 24, desktop: 32 })
 */
export function responsiveValue<T>(
  info: ResponsiveInfo,
  values: { mobile: T; tablet?: T; desktop?: T }
): T {
  if (info.isDesktop && values.desktop !== undefined) return values.desktop;
  if (info.isTablet && values.tablet !== undefined) return values.tablet;
  return values.mobile;
}

// ── Content wrapper style ────────────────────────────────────────────────────

/**
 * Returns styles for a centered, max-width-constrained content container.
 * Useful for wrapping page content so it doesn't stretch on wide screens.
 */
export function contentContainerStyle(info: ResponsiveInfo) {
  return {
    maxWidth: info.maxContentWidth,
    alignSelf: 'center' as const,
    width: '100%' as const,
    paddingHorizontal: info.contentPadding,
  };
}
