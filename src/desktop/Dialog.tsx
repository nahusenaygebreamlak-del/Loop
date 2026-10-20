import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useCloseSheet } from '@/components/Sheet';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { Kbd } from './Kbd';

/** Computer confirm dialog (.dlgc): title, text, Cancel Esc / red or blue action. Open with sheets.open(…, 'dialog'). */
export function DeskConfirm({ title, body, children, confirmLabel, danger = true, onConfirm }: { title: string; body: string; children?: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  return (
    <View accessibilityRole="alert" style={{ width: 460, maxWidth: '100%', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border, padding: 26, gap: 16 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>
        {title}
      </AppText>
      <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22 }}>
        {body}
      </AppText>
      {children}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Pressable accessibilityRole="button" onPress={close} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.ground }}>
          <AppText style={{ ...font(800), fontSize: 14.5 }}>Cancel</AppText>
          <Kbd k="Esc" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            close();
            onConfirm();
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: danger ? c.danger : c.accent }}
        >
          <AppText style={{ ...font(800), fontSize: 14.5, color: '#FFFFFF' }}>{confirmLabel}</AppText>
        </Pressable>
      </View>
    </View>
  );
}
