import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { AppText } from './AppText';
import { PressScale } from './PressScale';
import { useCloseSheet } from './Sheet';

/** Confirm dialog (NListDelete, NEmptyTrash, NSignOut). Open with sheets.open(render, 'dialog'). */
export function ConfirmDialog({
  title,
  body,
  extra,
  confirmLabel,
  onConfirm,
}: {
  title: string;
  body: string;
  extra?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const { c } = useTheme();
  const close = useCloseSheet();
  return (
    <View accessibilityRole="alert" accessibilityViewIsModal style={{ backgroundColor: c.card, borderRadius: 26, paddingTop: 24, paddingHorizontal: 22, paddingBottom: 18, gap: 10 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>
        {title}
      </AppText>
      <AppText tone="secondary" style={{ fontSize: 15, lineHeight: 23 }}>
        {body}
      </AppText>
      {extra}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <PressScale accessibilityRole="button" onPress={close} style={{ flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}>
          <AppText style={{ ...font(700), fontSize: 15 }}>Cancel</AppText>
        </PressScale>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            close();
            onConfirm();
          }}
          style={{ flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ ...font(800), fontSize: 15, color: '#FFFFFF' }}>{confirmLabel}</AppText>
        </PressScale>
      </View>
    </View>
  );
}
