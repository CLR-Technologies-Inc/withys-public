import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useColors } from '@/lib/ThemeProvider';

interface SkeletonProps {
  width?: any;
  height?: any;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const styles = useStyles();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function LoadingSkeletonList({ count = 5 }: { count?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.header}>
            <Skeleton width={80} height={14} />
            <Skeleton width={120} height={14} />
          </View>
          <Skeleton width="100%" height={16} style={{ marginTop: 12 }} />
          <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
          <View style={styles.footer}>
            <Skeleton width={50} height={20} borderRadius={6} />
            <Skeleton width={50} height={20} borderRadius={6} style={{ marginLeft: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function useStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
    container: { padding: 16 },
    skeleton: { backgroundColor: colors.borderSubtle },
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between' },
    footer: { flexDirection: 'row', marginTop: 16 },
  }), [colors]);
}
