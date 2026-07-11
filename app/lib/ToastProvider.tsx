/**
 * WWLO Toast system — port of the design system's `Feedback.jsx` ToastProvider.
 *
 * Provides a single mounted toast host at the root layout that any screen
 * can push into via `useToast().push({ kind, title, message, action })`.
 *
 * Mirrors the design tokens:
 *   - kinds: success | error | info | vault — each gets its own icon + accent
 *   - bottom-aligned host (above the tab bar) on mobile, top-right on web
 *   - auto-dismisses after `duration` ms (default 3200)
 *   - dark-mode toasts use `surfaceMid` + ghost border (no shadows)
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
// Use the same `@/...` alias every screen uses — see `app/_layout.tsx`
// note for why mixing aliases and relative paths can split the React
// context into two instances.
import { useColors } from '@/lib/ThemeProvider';
import type { ColorPalette } from '@/constants/Colors';
import { Duration, ZIndex } from '@/constants/Motion';

export type ToastKind = 'success' | 'error' | 'info' | 'vault';

interface ToastInput {
  kind?: ToastKind;
  title?: string;
  message: string;
  /** ms before auto-dismiss; pass `0` to keep until manually dismissed. */
  duration?: number;
  /** Optional inline action button — common pattern: undo. */
  action?: { label: string; onPress: () => void };
}

interface ToastEntry extends ToastInput {
  id: number;
  kind: ToastKind;
}

interface ToastContextValue {
  push: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  push: () => 0,
  dismiss: () => {},
});

const ICONS: Record<ToastKind, React.ComponentProps<typeof FontAwesome>['name']> = {
  success: 'check-circle',
  error: 'exclamation-circle',
  info: 'info-circle',
  vault: 'lock',
};

const DEFAULT_DURATION = 3200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const idCounter = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = ++idCounter.current;
      const entry: ToastEntry = { kind: 'info', ...toast, id };
      setToasts((list) => [...list, entry]);

      const duration = toast.duration ?? DEFAULT_DURATION;
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: ToastEntry[];
  onDismiss: (id: number) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.host}>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} colors={colors} onDismiss={() => onDismiss(t.id)} />
      ))}
    </View>
  );
}

function ToastCard({
  toast,
  colors,
  onDismiss,
}: {
  toast: ToastEntry;
  colors: ColorPalette;
  onDismiss: () => void;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: Duration[2],
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: Duration[2],
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const accent = kindAccent(toast.kind, colors);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <FontAwesome name={ICONS[toast.kind]} size={18} color={accent} />
      <View style={styles.body}>
        {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
        <Text style={styles.message}>{toast.message}</Text>
      </View>
      {toast.action ? (
        <Pressable
          onPress={() => {
            toast.action!.onPress();
            onDismiss();
          }}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionText, { color: colors.secondaryAccent }]}>
            {toast.action.label}
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={onDismiss} style={styles.dismissBtn} hitSlop={10}>
          <FontAwesome name="times" size={12} color={colors.textMuted} />
        </Pressable>
      )}
    </Animated.View>
  );
}

function kindAccent(kind: ToastKind, colors: ColorPalette): string {
  switch (kind) {
    case 'success': return colors.success;
    case 'error': return colors.danger;
    case 'vault': return colors.vaultAccent;
    case 'info':
    default: return colors.secondaryAccent;
  }
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    host: {
      position: 'absolute',
      bottom: Platform.OS === 'web' ? 24 : 90,
      left: 16,
      right: 16,
      gap: 8,
      zIndex: ZIndex.toast,
      // Stack newest at the bottom; on desktop float them top-right.
      ...(Platform.OS === 'web'
        ? { top: 24, bottom: undefined, left: undefined, right: 24, maxWidth: 380, alignSelf: 'flex-end' as const }
        : null),
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerHighest ?? colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontWeight: '600',
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 1,
    },
    message: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    actionBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '600',
    },
    dismissBtn: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
  });
}
