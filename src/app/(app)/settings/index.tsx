import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SetRow } from '@/components/settingsRows';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Card, GroupLabel, IconButton } from '@/components/ui';
import { goBack } from '@/features/nav';
import { CheckinTimeSheet, THEME_LABEL, ThemeSheet, WeekTimeSheet } from '@/features/sheets/SettingsSheets';
import { formatTime } from '@/lib/dates';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** NSettings2 */
export default function Settings() {
  const { c, preference } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const snack = useSnackbar();
  const { session, preview } = useAuth();
  const s = useSettings();
  const lists = useStore((st) => st.lists);
  const live = lists.filter((l) => !l.deletedAt && !l.archivedAt).length;
  const archived = lists.filter((l) => !l.deletedAt && l.archivedAt).length;

  const name = (session?.user.user_metadata?.full_name as string | undefined) ?? (preview ? 'Preview' : 'You');
  const email = session?.user.email ?? 'Not signed in';
  const time = (t: string | null) => (t ? formatTime(t) : 'Off');

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}>
        <View style={{ paddingTop: 18, paddingLeft: 14, paddingRight: size.sideMargin }}>
          <IconButton icon="back" label="Back" onPress={goBack} />
          <AppText variant="display" accessibilityRole="header" style={{ marginTop: 8, marginLeft: 10 }}>
            Settings
          </AppText>
        </View>

        <PressScale
          kind="row"
          accessibilityRole="button"
          accessibilityLabel={`Account and Google, ${email}`}
          onPress={() => router.push('/settings/account')}
          style={{ marginTop: 18, marginHorizontal: size.sideMargin, backgroundColor: c.card, borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}
        >
          <View aria-hidden style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: listColors.purple, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ ...font(800), fontSize: 17, color: '#FFFFFF' }}>{name.slice(0, 1).toUpperCase()}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ ...font(800), fontSize: 16 }}>Account and Google</AppText>
            <AppText tone="secondary" numberOfLines={1} style={{ fontSize: 13, marginTop: 2 }}>
              {email} · Calendar not connected
            </AppText>
          </View>
          <Icon name="forward" size={18} color={c.line} />
        </PressScale>

        <GroupLabel style={{ paddingTop: 16, paddingBottom: 8 }}>Daily check-ins</GroupLabel>
        <Card>
          <SetRow name="Morning" hint="Plan the day, sort leftovers" value={time(s.morningTime)} valueMuted={!s.morningTime} onPress={() => sheets.open(() => <CheckinTimeSheet kind="morningTime" />)} />
          <SetRow name="Afternoon" hint="Only if something is still open" value={time(s.afternoonTime)} valueMuted={!s.afternoonTime} onPress={() => sheets.open(() => <CheckinTimeSheet kind="afternoonTime" />)} />
          <SetRow name="Full screen when locked" toggle={s.fullScreen} onPress={() => s.set({ fullScreen: !s.fullScreen })} />
          <SetRow name="On weekends" toggle={s.weekends} last onPress={() => s.set({ weekends: !s.weekends })} />
        </Card>

        <GroupLabel style={{ paddingTop: 16, paddingBottom: 8 }}>Inbox</GroupLabel>
        <Card>
          <SetRow name="Sort reminder" hint="Only when there are notes" value={time(s.sortTime)} valueMuted={!s.sortTime} last onPress={() => sheets.open(() => <CheckinTimeSheet kind="sortTime" />)} />
        </Card>

        <GroupLabel style={{ paddingTop: 16, paddingBottom: 8 }}>Lists and look</GroupLabel>
        <Card>
          <SetRow
            name="Lists"
            hint="Order, archived lists"
            value={`${live}${archived ? ` · ${archived} archived` : ''}`}
            valueMuted
            onPress={() => router.push('/settings/lists')}
          />
          <SetRow name="Theme" hint="Light, dark or follow the phone" value={preference === 'system' ? 'Phone' : THEME_LABEL[preference]} onPress={() => sheets.open(() => <ThemeSheet />)} />
          <SetRow
            name="Week and time"
            value={`${s.weekStart === 0 ? 'Sunday' : 'Monday'} · ${s.timeFormat === '24h' ? '24-hour' : '12-hour'}`}
            last
            onPress={() => sheets.open(() => <WeekTimeSheet />)}
          />
        </Card>

        <GroupLabel style={{ paddingTop: 16, paddingBottom: 8 }}>Help</GroupLabel>
        <Card>
          <SetRow
            name="Replay the tutorial"
            trailing={<Icon name="forward" size={18} color={c.line} />}
            last
            onPress={() => snack({ title: 'The tutorial arrives in Milestone 6' })}
          />
        </Card>
      </ScrollView>
    </View>
  );
}
