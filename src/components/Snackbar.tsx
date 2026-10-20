import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { easingCurve, motion } from '@/theme/tokens';
import { useDesk, isDeskNow } from '@/desktop/layout';
import { Kbd } from '@/desktop/Kbd';
import { AppText } from './AppText';
import { PressScale } from './PressScale';

// Dark snackbar above the + button with light-blue actions (NDoneUndo, NDeleteUndo, NAdded).

type Action = { label: string; onPress: () => void };
/** `bottom` lifts the bar above a screen's own buttons (the sorting screen). */
export type SnackOptions = { title: string; sub?: string; actions?: Action[]; duration?: number; bottom?: number };
type Snack = SnackOptions & { id: number };

const SnackContext = createContext<((s: SnackOptions) => void) | null>(null);

// For code outside React screens (e.g. finishing the check-in after navigating).
let external: ((s: SnackOptions) => void) | null = null;
export function pushSnack(s: SnackOptions) {
  external?.(s);
}

// Computer: Ctrl Z runs the latest snackbar's Undo (docs/11, "Toasts").
let lastUndo: (() => void) | null = null;
let dismissCurrent: (() => void) | null = null;
export function undoLast(): boolean {
  if (!lastUndo) return false;
  const fn = lastUndo;
  lastUndo = null;
  fn();
  dismissCurrent?.();
  return true;
}

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
      lastUndo = s.actions?.find((a) => a.label === 'Undo')?.onPress ?? null;
      dismissCurrent = dismiss;
      // NSnackbars: 4 s, or 8 s when the snackbar offers Undo.
      // Computer toasts stay 6 s.
      timer.current = setTimeout(dismiss, s.duration ?? (isDeskNow() ? 6000 : s.actions?.some((a) => a.label === 'Undo') ? 8000 : 4000));
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);
  useEffect(() => {
    external = show;
    return () => {
      if (external === show) external = null;
    };
  }, [show]);

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
  const { desk, sideInline, panelInline } = useDesk();
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
      style={[
        styles.bar,
        { backgroundColor: c.snackbar, bottom: (snack.bottom ?? 112) + insets.bottom, minHeight: snack.sub ? undefined : 60 },
        // Computer: centred over the main column, 28 px from the bottom.
        desk ? { left: sideInline ? 264 : 0, right: panelInline ? 416 : 0, bottom: 28, alignSelf: 'center', marginHorizontal: 'auto', maxWidth: 560, minHeight: 52, borderRadius: 16, paddingVertical: 6, paddingLeft: 18 } : null,
        anim,
      ]}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="button" style={{ fontSize: desk ? 14.5 : 15, color: c.snackbarAction }}>
              {a.label}
            </AppText>
            {desk && a.label === 'Undo' ? (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Kbd k="Ctrl" onDark />
                <Kbd k="Z" onDark />
              </View>
            ) : null}
          </View>
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
