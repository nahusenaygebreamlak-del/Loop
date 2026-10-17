import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoopAlarm from '../../../../modules/loop-alarm';
import { AppText } from '@/components/AppText';
import { Pop } from '@/components/Motion';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { goMain } from '@/features/nav';
import { formatTime, todayKey } from '@/lib/dates';
import { isOpen, visibleTasks } from '@/lib/taskViews';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** NCheckinsOn: what was set up, after "Turn on check-ins". */
export default function CheckinsOn() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const tasks = useStore((st) => st.tasks);
  const lists = useStore((st) => st.lists);
  const open = visibleTasks(tasks, lists).filter((t) => isOpen(t) && t.dueDate && t.dueDate <= todayKey()).length;
  const full = s.fullScreen && (!LoopAlarm || LoopAlarm.canUseFullScreenIntent());

  const rows: [string, string, string, boolean][] = [
    ['Morning', 'Plan the day, sort leftovers', s.morningTime ? formatTime(s.morningTime) : 'Off', true],
    ['Afternoon', 'Only if something is still open', s.afternoonTime ? formatTime(s.afternoonTime) : 'Off', true],
    ['Style', full ? 'Fills the screen when locked' : 'A notification banner', full ? 'Full screen' : 'Banner', false],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: 24 + insets.top, paddingBottom: 28 + insets.bottom, paddingHorizontal: size.sideMargin }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <PressScale accessibilityRole="button" accessibilityLabel="Close" onPress={() => goMain('/')} style={{ width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" color={c.text} />
        </PressScale>
      </View>
      <Pop><View aria-hidden style={{ marginTop: 36, width: 72, height: 72, borderRadius: 36, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={34} strokeWidth={2.6} color={c.onAccent} />
      </View></Pop>
      <AppText accessibilityRole="header" style={{ marginTop: 24, ...font(800), fontSize: 32, lineHeight: 38, letterSpacing: -0.64 }}>
        Check-ins are on
      </AppText>
      <AppText tone="secondary" style={{ marginTop: 10, fontSize: 16, lineHeight: 25 }}>
        {open ? `The first one comes tomorrow morning, with the ${open} task${open === 1 ? '' : 's'} left over today.` : 'The first one comes tomorrow morning.'}
      </AppText>
      <View style={{ marginTop: 28, backgroundColor: c.card, borderRadius: 20 }}>
        {rows.map(([k, hint, v, blue], i) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: c.ground }}>
            <View style={{ flex: 1 }}>
              <AppText style={{ ...font(700), fontSize: 15.5 }}>{k}</AppText>
              <AppText tone="secondary" style={{ ...font(500), fontSize: 13, marginTop: 3 }}>
                {hint}
              </AppText>
            </View>
            <AppText style={{ ...font(800), fontSize: 15, color: blue ? c.accentText : c.text, fontVariant: ['tabular-nums'] }}>{v}</AppText>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ gap: 10 }}>
        <PrimaryButton label="Back to Today" onPress={() => goMain('/')} />
        <AppText tone="secondary" style={{ fontSize: 13.5, textAlign: 'center' }}>
          Change any of this in Settings › Check-ins.
        </AppText>
      </View>
    </View>
  );
}
