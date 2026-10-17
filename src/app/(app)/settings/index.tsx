import { router } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { SetRow } from '@/components/settingsRows';
import { useSheets } from '@/components/Sheet';
import { Card, GroupLabel, IconButton } from '@/components/ui';
import { goBack } from '@/features/nav';
import { CheckinTimeSheet, THEME_LABEL, ThemeSheet, WeekTimeSheet } from '@/features/sheets/SettingsSheets';
import { formatTime } from '@/lib/dates';
import { useCalendar } from '@/calendar/google';
import { useAuth } from '@/lib/auth';
import { useNotificationsAllowed } from '@/notifications/useAllowed';
import LoopAlarm from '../../../../modules/loop-alarm';
import { useSettings, useTimeFormat } from '@/store/settings';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** NSettings2 */
export default function Settings() {
  const { c, preference } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const { session, preview } = useAuth();
  const s = useSettings();
  const timeFormat = useTimeFormat();
  const calStatus = useCalendar((st) => st.status);
  const lists = useStore((st) => st.lists);
  const live = lists.filter((l) => !l.deletedAt && !l.archivedAt).length;
  const archived = lists.filter((l) => !l.deletedAt && l.archivedAt).length;

  const name = (session?.user.user_metadata?.full_name as string | undefined) ?? (preview ? 'Preview' : 'You');
  const email = session?.user.email ?? 'Not signed in';
  const time = (t: string | null) => (t ? formatTime(t) : 'Off');
  const needsExact = !!LoopAlarm && !LoopAlarm.canScheduleExactAlarms();
  const off = useNotificationsAllowed() === false;

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
              {email} · {calStatus === 'off' || calStatus === 'connecting' ? 'Calendar not connected' : 'Calendar connected'}
            </AppText>
          </View>
          <Icon name="forward" size={18} color={c.line} />
        </PressScale>

        {off ? (
          <View accessibilityRole="alert" style={{ marginTop: 18, marginHorizontal: size.sideMargin, backgroundColor: c.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: c.warn }} />
              <View style={{ flex: 1 }}>
                <AppText style={{ ...font(800), fontSize: 16 }}>Notifications are off for Loop</AppText>
                <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21, marginTop: 4 }}>
                  {"Check-ins can't reach you, so they're paused. Leftovers will show on Today when you open the app."}
                </AppText>
              </View>
            </View>
            <PressScale
              accessibilityRole="button"
              onPress={() => void Linking.openSettings()}
              style={{ minHeight: 48, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText style={{ ...font(800), fontSize: 15, color: c.onAccent }}>Open phone settings</AppText>
            </PressScale>
          </View>
        ) : null}

        <GroupLabel style={{ paddingTop: 16, paddingBottom: 8 }}>Daily check-ins</GroupLabel>
        <Card style={off ? { opacity: 0.6 } : undefined}>
          <SetRow
            name="Morning"
            hint={off ? 'Paused' : 'Plan the day, sort leftovers'}
            value={time(s.morningTime)}
            valueMuted={off || !s.morningTime}
            valueStrike={off && !!s.morningTime}
            onPress={() => sheets.open(() => <CheckinTimeSheet kind="morningTime" />)}
          />
          <SetRow
            name="Afternoon"
            hint={off ? 'Paused' : 'Only if something is still open'}
            value={time(s.afternoonTime)}
            valueMuted={off || !s.afternoonTime}
            valueStrike={off && !!s.afternoonTime}
            last={off}
            onPress={() => sheets.open(() => <CheckinTimeSheet kind="afternoonTime" />)}
          />
          {off ? null : (
            <>
              <SetRow
                name="Full screen when locked"
                hint={s.fullScreen && LoopAlarm && !LoopAlarm.canUseFullScreenIntent() ? 'Allow it in Android settings · tap to open' : undefined}
                toggle={s.fullScreen}
                onPress={() => {
                  const on = !s.fullScreen;
                  s.set({ fullScreen: on });
                  // Android 14+ needs a one-time "full-screen notifications" permission.
                  if (on && LoopAlarm && !LoopAlarm.canUseFullScreenIntent()) LoopAlarm.openFullScreenSettings();
                }}
              />
              <SetRow name="On weekends" toggle={s.weekends} last onPress={() => s.set({ weekends: !s.weekends })} />
            </>
          )}
        </Card>
        <Card style={{ marginTop: 10 }}>
          <SetRow name="Remind until I act" hint="Repeats every 15 min until you answer" toggle={s.remindUntilAct} last={!needsExact} onPress={() => s.set({ remindUntilAct: !s.remindUntilAct })} />
          {needsExact ? (
            <SetRow name="Allow exact times" hint="Android may delay check-ins by a few minutes" hintColor={c.warnText} value="Allow" last onPress={() => LoopAlarm?.openExactAlarmSettings()} />
          ) : null}
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
            value={`${s.weekStart === 0 ? 'Sunday' : 'Monday'} · ${timeFormat === '24h' ? '24-hour' : '12-hour'}`}
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
            onPress={() => router.push('/welcome/tutorial')}
          />
        </Card>
      </ScrollView>
    </View>
  );
}
