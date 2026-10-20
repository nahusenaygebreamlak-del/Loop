import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDesk } from '@/desktop/layout';
import { useKeyboardHeight } from '@/lib/useKeyboard';
import { useTheme } from '@/theme/ThemeProvider';
import { easingCurve, motion, radius } from '@/theme/tokens';

// Overlays over a dim backdrop (tap to close), stacked in order:
// - 'sheet': bottom sheet with a grab handle and 28 px top corners
// - 'drawer': the side menu, sliding in from the left
// - 'dialog': a centred confirm dialog that pops in
// - 'menu': (computer) a floating card at the pointer or a button, no dimming
// On the computer, sheets become dialogs near the top over a light scrim (docs/11, "Pop-ups"); Esc closes.

export type OverlayKind = 'sheet' | 'drawer' | 'dialog' | 'menu';
export type Anchor = { x: number; y: number; alignRight?: boolean };
type Entry = { id: number; render: () => ReactNode; closing: boolean; kind: OverlayKind; anchor?: Anchor };
type SheetApi = { open: (render: () => ReactNode, kind?: OverlayKind, anchor?: Anchor) => void; count: () => number };

let openCount = 0;
/** True while any sheet, dialog or menu is open (keyboard shortcuts stay quiet then). */
export const overlayOpen = () => openCount > 0;

const SheetsContext = createContext<SheetApi | null>(null);
const CloseContext = createContext<() => void>(() => {});

export function SheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Entry[]>([]);
  const nextId = useRef(1);

  const api = useMemo<SheetApi>(
    () => ({
      open: (render, kind = 'sheet', anchor) => setStack((s) => [...s, { id: nextId.current++, render, closing: false, kind, anchor }]),
      count: () => openCount,
    }),
    [],
  );
  useEffect(() => {
    openCount = stack.filter((e) => !e.closing).length;
  }, [stack]);

  // Esc closes the top overlay (computer).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const top = [...stack].reverse().find((x) => !x.closing);
      if (!top) return;
      e.preventDefault();
      e.stopPropagation();
      setStack((st) => st.map((x) => (x.id === top.id ? { ...x, closing: true } : x)));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [stack]);

  const startClose = useCallback((id: number) => setStack((s) => s.map((e) => (e.id === id ? { ...e, closing: true } : e))), []);
  const remove = useCallback((id: number) => setStack((s) => s.filter((e) => e.id !== id)), []);

  return (
    <SheetsContext.Provider value={api}>
      {children}
      {stack.map((e) => (
        <SheetFrame key={e.id} kind={e.kind} anchor={e.anchor} closing={e.closing} onRequestClose={() => startClose(e.id)} onClosed={() => remove(e.id)}>
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
  kind: asked,
  anchor,
  closing,
  onRequestClose,
  onClosed,
}: {
  children: ReactNode;
  kind: OverlayKind;
  anchor?: Anchor;
  closing: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
}) {
  const { c } = useTheme();
  const { desk, width: winW, height: winH } = useDesk();
  // On the computer a bottom sheet is shown as a pop-up dialog near the top.
  const kind: OverlayKind | 'pop' = desk && asked === 'sheet' ? 'pop' : asked;
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
    if (kind === 'dialog' || kind === 'pop' || kind === 'menu') return { opacity: Math.min(1, p * 1.6), transform: [{ scale: p < 0.6 ? 0.92 + (p / 0.6) * 0.1 : 1.02 - ((p - 0.6) / 0.4) * 0.02 }] };
    return { transform: [{ translateY: (1 - p) * size.h }] };
  });

  // Sheets sit above the keyboard: the backdrop stays, the panel's bottom edge follows the keyboard.
  const keyboard = useKeyboardHeight();
  const lift = useAnimatedStyle(() => ({ paddingBottom: kind === 'drawer' || desk ? 0 : keyboard.value }));
  const [menuSize, setMenuSize] = useState({ w: 270, h: 0 });

  const measure = (e: { nativeEvent: { layout: { width: number; height: number } } }) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onRequestClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={[styles.fill, lift]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: kind === 'menu' ? 'transparent' : desk ? c.desk.scrim : c.backdrop }, backdrop]}>
          <Pressable style={styles.fill} onPress={onRequestClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        {kind === 'drawer' ? (
          <View style={[styles.fill, { flexDirection: 'row' }]} pointerEvents="box-none">
            <Animated.View onLayout={measure} style={panel}>
              {children}
            </Animated.View>
          </View>
        ) : kind === 'menu' ? (
          <View style={styles.fill} pointerEvents="box-none">
            <Animated.View
              onLayout={(e) => setMenuSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
              style={[
                {
                  position: 'absolute',
                  left: Math.max(8, Math.min(winW - menuSize.w - 8, anchor?.alignRight ? (anchor?.x ?? 0) - menuSize.w : (anchor?.x ?? 0))),
                  top: Math.max(8, Math.min(winH - menuSize.h - 8, anchor?.y ?? 0)),
                },
                panel,
              ]}
            >
              {children}
            </Animated.View>
          </View>
        ) : kind === 'dialog' || kind === 'pop' ? (
          <View style={[styles.fill, desk ? { alignItems: 'center', paddingTop: 120, paddingHorizontal: 16 } : { justifyContent: 'center', padding: 24 }]} pointerEvents="box-none">
            <Animated.View style={[panel, desk && asked === 'dialog' ? { width: 460, maxWidth: '100%' } : null]}>{children}</Animated.View>
          </View>
        ) : (
          <View style={styles.fill} pointerEvents="box-none">
            <View style={styles.fill} pointerEvents="none" />
            <Animated.View onLayout={measure} style={panel}>
              {children}
            </Animated.View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

/** The visible sheet card. `header` sits above the card (quick actions shows the task there). */
export function SheetCard({ children, gap = 16, label, style, header }: { children: ReactNode; gap?: number; label: string; style?: ViewStyle; header?: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { desk } = useDesk();
  if (desk) {
    // Computer: the same content as a 460 px pop-up card (dlgc), no grab handle.
    return (
      <View accessibilityLabel={label} accessibilityViewIsModal style={{ width: 460, maxWidth: '100%', gap: 12 }}>
        {header}
        <View style={[{ backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border, padding: 26, gap }, style, { paddingBottom: 26 }]}>{children}</View>
      </View>
    );
  }
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
