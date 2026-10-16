import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { easingCurve, motion, radius } from '@/theme/tokens';

// Bottom sheets: grab handle, white card with 28 px top corners, dim backdrop (tap to close).
// Sheets stack: a picker opened from quick add sits on top of it.

type Entry = { id: number; render: () => ReactNode; closing: boolean };
type SheetApi = { open: (render: () => ReactNode) => void };

const SheetsContext = createContext<SheetApi | null>(null);
const CloseContext = createContext<() => void>(() => {});

export function SheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Entry[]>([]);
  const nextId = useRef(1);

  const api = useMemo<SheetApi>(
    () => ({
      open: (render) => setStack((s) => [...s, { id: nextId.current++, render, closing: false }]),
    }),
    [],
  );

  const startClose = useCallback((id: number) => setStack((s) => s.map((e) => (e.id === id ? { ...e, closing: true } : e))), []);
  const remove = useCallback((id: number) => setStack((s) => s.filter((e) => e.id !== id)), []);

  return (
    <SheetsContext.Provider value={api}>
      {children}
      {stack.map((e) => (
        <SheetFrame key={e.id} closing={e.closing} onRequestClose={() => startClose(e.id)} onClosed={() => remove(e.id)}>
          <CloseContext.Provider value={() => startClose(e.id)}>{e.render()}</CloseContext.Provider>
        </SheetFrame>
      ))}
    </SheetsContext.Provider>
  );
}

export function useSheets() {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used inside SheetProvider');
  return ctx;
}

/** Closes the sheet this component is rendered in. */
export function useCloseSheet() {
  return useContext(CloseContext);
}

function SheetFrame({ children, closing, onRequestClose, onClosed }: { children: ReactNode; closing: boolean; onRequestClose: () => void; onClosed: () => void }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  const [height, setHeight] = useState(800);

  useEffect(() => {
    const ease = Easing.bezier(...easingCurve);
    if (closing) {
      if (reduced) onClosed();
      else progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, (fin) => fin && runOnJS(onClosed)());
    } else if (!reduced) {
      progress.value = withTiming(1, { duration: motion.sheetIn.duration, easing: ease });
    }
  }, [closing, reduced, progress, onClosed]);

  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value * (motion.sheetIn.duration / motion.backdropIn.duration)) }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * height }] }));

  return (
    <Modal transparent visible animationType="none" onRequestClose={onRequestClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop }, backdrop]}>
          <Pressable style={styles.fill} onPress={onRequestClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        <View style={styles.fill} pointerEvents="box-none">
          <View style={styles.fill} pointerEvents="none" />
          <Animated.View onLayout={(e) => setHeight(e.nativeEvent.layout.height)} style={sheet}>
            {children}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The visible sheet card. `header` sits above the card (quick actions shows the task there). */
export function SheetCard({ children, gap = 16, label, style, header }: { children: ReactNode; gap?: number; label: string; style?: ViewStyle; header?: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <>
      {header}
      <View
        accessibilityLabel={label}
        accessibilityViewIsModal
        style={[
          {
            backgroundColor: c.card,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingTop: 12,
            paddingHorizontal: 24,
            paddingBottom: 24 + insets.bottom,
            gap,
          },
          style,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: c.line }]} />
        {children}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3 },
});
