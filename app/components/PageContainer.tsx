/**
 * PageContainer — Responsive wrapper that constrains content width on
 * tablet and desktop, centers horizontally, and applies appropriate padding.
 *
 * Use this as the outermost wrapper for every page's content to achieve
 * consistent responsive behavior across mobile / tablet / desktop.
 */

import React from 'react';
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { useResponsive, type ResponsiveInfo } from '@/lib/useResponsive';

interface PageContainerProps {
  /** Render children as a function to get responsive info */
  children: React.ReactNode | ((info: ResponsiveInfo) => React.ReactNode);
  /** Wrap content in a ScrollView (default: false) */
  scroll?: boolean;
  /** Extra style on the outer wrapper */
  style?: ViewStyle;
  /** Extra padding-bottom for scroll content */
  paddingBottom?: number;
  /** Skip the max-width constraint */
  fullWidth?: boolean;
}

export function PageContainer({ children, scroll, style, paddingBottom = 40, fullWidth }: PageContainerProps) {
  const info = useResponsive();

  const resolvedChildren = typeof children === 'function' ? children(info) : children;

  const innerStyle: ViewStyle = fullWidth
    ? { flex: 1, paddingHorizontal: info.contentPadding }
    : {
        maxWidth: info.maxContentWidth,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: info.contentPadding,
      };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.container, style]}
        contentContainerStyle={[innerStyle, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {resolvedChildren}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[innerStyle, { flex: 1 }]}>
        {resolvedChildren}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
