import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { easingCurve, motion, radius } from '@/theme/tokens';

// Overlays over a dim backdrop (tap to close), stacked in order:
// - 'sheet': bottom sheet with a grab handle and 28 px top corners
// - 'drawer': the side menu, sliding in from the left
// - 'dialog': a centred confirm dialog that pops in

export type OverlayKind = 'sheet' | 'drawer' | 'dialog';
type Entry = { id: number; render: () => ReactNode; closing: boolean; kind: OverlayKind };
type SheetApi = { open: (render: () => ReactNode, kind?: OverlayKind) => void };

const SheetsContext = createContext<SheetApi | null>(null);
const CloseContext = createContext<() => void>(() => {});

export function SheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Entry[]>([]);
  const nextId = useRef(1);

  const api = useMemo<SheetApi>(
    () => ({
      open: (render, kind = 'sheet') => setStack((s) => [...s, { id: nextId.current++, render, closing: false, kind }]),
    }),
    [],
  );

  const startClose = useCallback((id: number) => setStack((s) => s.map((e) => (e.id === id ? { ...e, closing: true } : e))), []);
  const remove = useCallback((id: number) => setStack((s) => s.filter((e) => e.id !== id)), []);

  return (
    <SheetsContext.Provider value={api}>
      {children}
      {stack.map((e) => (
        <SheetFrame key={e.id} kind={e.kind} closing={e.closing} onRequestClose={() => startClose(e.id)} onClosed={() => remove(e.id)}>
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

function SheetFrame({
  children,
  kind,
  closing,
  onRequestClose,
  onClosed,
}: {
  children: ReactNode;
  kind: OverlayKind;
  closing: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  const [size, setSize] = useState({ w: 400, h: 800 });
  const inDuration = kind === 'drawer' ? motion.sideMenuIn.duration : kind === 'dialog' ? motion.dialogIn.duration : motion.sheetIn.duration;

  useEffect(() => {
    const ease = Easing.bezier(...easingCurve);
    if (closing) {
      if (reduced) onClosed();
      else progress.set(withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, (fin) => fin && runOnJS(onClosed)()));
    } else if (!reduced) {
      progress.set(withTiming(1, { duration: inDuration, easing: ease }));
    }
  }, [closing, reduced, progress, onClosed, inDuration]);

  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value * (inDuration / motion.backdropIn.duration)) }));
  const panel = useAnimatedStyle(() => {
    const p = progress.value;
    if (kind === 'drawer') return { transform: [{ translateX: (p - 1) * size.w }] };
    if (kind === 'dialog') return { opacity: Math.min(1, p * 1.6), transform: [{ scale: p < 0.6 ? 0.92 + (p / 0.6) * 0.1 : 1.02 - ((p - 0.6) / 0.4) * 0.02 }] };
    return { transform: [{ translateY: (1 - p) * size.h }] };
  });

  const measure = (e: { nativeEvent: { layout: { width: number; height: number } } }) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onRequestClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.backdrop }, backdrop]}>
          <Pressable style={styles.fill} onPress={onRequestClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        {kind === 'drawer' ? (
          <View style={[styles.fill, { flexDirection: 'row' }]} pointerEvents="box-none">
            <Animated.View onLayout={measure} style={panel}>
              {children}
            </Animated.View>
          </View>
        ) : kind === 'dialog' ? (
          <View style={[styles.fill, { justifyContent: 'center', padding: 24 }]} pointerEvents="box-none">
            <Animated.View style={panel}>{children}</Animated.View>
          </View>
        ) : (
          <View style={styles.fill} pointerEvents="box-none">
            <View style={styles.fill} pointerEvents="none" />
            <Animated.View onLayout={measure} style={panel}>
              {children}
            </Animated.View>
          </View>
        )}
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
