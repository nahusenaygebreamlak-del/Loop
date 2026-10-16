import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { easingCurve, motion } from '@/theme/tokens';
import { AppText } from './AppText';
import { PressScale } from './PressScale';

// Dark snackbar above the + button with light-blue actions (NDoneUndo, NDeleteUndo, NAdded).

type Action = { label: string; onPress: () => void };
export type SnackOptions = { title: string; sub?: string; actions?: Action[]; duration?: number };
type Snack = SnackOptions & { id: number };

const SnackContext = createContext<((s: SnackOptions) => void) | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSnack(null);
  }, []);

  const show = useCallback(
    (s: SnackOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setSnack({ ...s, id: nextId.current++ });
      timer.current = setTimeout(dismiss, s.duration ?? 6000);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <SnackContext.Provider value={value}>
      {children}
      {snack ? <SnackbarView key={snack.id} snack={snack} onDone={dismiss} /> : null}
    </SnackContext.Provider>
  );
}

export function useSnackbar() {
  const ctx = useContext(SnackContext);
  if (!ctx) throw new Error('useSnackbar must be used inside SnackbarProvider');
  return ctx;
}

function SnackbarView({ snack, onDone }: { snack: Snack; onDone: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!reduced) {
      p.value = withDelay(80, withTiming(1, { duration: motion.snackbarIn.duration, easing: Easing.bezier(...easingCurve) }));
    }
  }, [p, reduced]);

  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.bar, { backgroundColor: c.snackbar, bottom: 112 + insets.bottom, minHeight: snack.sub ? undefined : 60 }, anim]}
    >
      <View style={styles.text}>
        <AppText style={[styles.title, { color: c.snackbarText }]}>{snack.title}</AppText>
        {snack.sub ? (
          <AppText numberOfLines={1} style={[styles.sub, { color: c.snackbarSecondary }]}>
            {snack.sub}
          </AppText>
        ) : null}
      </View>
      {snack.actions?.map((a) => (
        <PressScale
          key={a.label}
          accessibilityRole="button"
          onPress={() => {
            a.onPress();
            onDone();
          }}
          style={[styles.action, { paddingHorizontal: snack.actions!.length > 1 ? 12 : 16 }]}
        >
          <AppText variant="button" style={{ fontSize: 15, color: c.snackbarAction }}>
            {a.label}
          </AppText>
        </PressScale>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 8,
  },
  text: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' },
  sub: { fontSize: 13, marginTop: 2 },
  action: { minHeight: 44, borderRadius: 12, justifyContent: 'center' },
});
