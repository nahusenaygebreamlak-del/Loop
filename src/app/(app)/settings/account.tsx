import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { ConfirmDialog } from '@/components/Dialog';
import { PressScale } from '@/components/PressScale';
import { SetRow } from '@/components/settingsRows';
import { useSheets } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { Spinner } from '@/components/Spinner';
import { Card, GroupLabel, IconButton } from '@/components/ui';
import { goBack } from '@/features/nav';
import { connectGoogleCalendar, disconnectGoogleCalendar, loadCalendars, setCalendarEnabled, useCalendar } from '@/calendar/google';
import { useAuth } from '@/lib/auth';
import { syncNow, useSyncStatus } from '@/sync/engine';
import { ago } from '@/sync/status';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors, radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** NAccount / NAccountNoGoogle (connecting Google Calendar arrives in Milestone 7). */
export default function Account() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  const snack = useSnackbar();
  const cal = useCalendar();
  useEffect(() => {
    if (useCalendar.getState().status === 'connected') void loadCalendars().catch(() => {});
  }, []);
  const { session, preview, signOut } = useAuth();
  const { state, lastSyncedAt, pending } = useSyncStatus();
  const name = (session?.user.user_metadata?.full_name as string | undefined) ?? (preview ? 'Preview' : 'You');
  const email = session?.user.email;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}>
        <View style={{ paddingTop: 18, paddingLeft: 14, paddingRight: size.sideMargin }}>
          <IconButton icon="back" label="Back to Settings" onPress={goBack} />
          <AppText accessibilityRole="header" style={{ marginTop: 8, marginLeft: 10, ...font(800), fontSize: 32, lineHeight: 37, letterSpacing: -0.64 }}>
            Account and Google
          </AppText>
        </View>

        <View style={{ marginTop: 20, marginHorizontal: size.sideMargin, backgroundColor: c.card, borderRadius: radius.card, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View aria-hidden style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: listColors.purple, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ ...font(800), fontSize: 20, color: '#FFFFFF' }}>{name.slice(0, 1).toUpperCase()}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ ...font(800), fontSize: 17 }}>{name}</AppText>
            <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 2 }}>
              {email ? `${email} · signed in with Google` : 'Preview mode, no account'}
            </AppText>
          </View>
        </View>

        <GroupLabel style={{ paddingTop: 22, paddingBottom: 8 }}>Google Calendar</GroupLabel>
        {cal.status === 'off' || cal.status === 'connecting' ? (
          <Card>
            <SetRow
              name="Not connected"
              hint="Show your meetings next to your tasks. Read-only."
              last
              trailing={
                <PressScale
                  accessibilityRole="button"
                  accessibilityLabel="Connect Google Calendar"
                  disabled={cal.status === 'connecting'}
                  onPress={() => connectGoogleCalendar().catch(() => snack({ title: "Couldn't connect Google Calendar", sub: 'Your tasks are fine. Try again in a moment.' }))}
                  style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.accent, justifyContent: 'center' }}
                >
                  {cal.status === 'connecting' ? <Spinner color={c.onAccent} track="rgba(255,255,255,0.3)" /> : <AppText style={{ ...font(800), fontSize: 14, color: c.onAccent }}>Connect</AppText>}
                </PressScale>
              }
            />
          </Card>
        ) : (
          <Card>
            <SetRow
              name={cal.status === 'failed' ? "Can't reach Google" : 'Connected'}
              hint={cal.status === 'failed' ? 'Tap to sign in again · your tasks are fine' : `Last synced ${ago(cal.fetchedAt)} · read-only`}
              hintColor={cal.status === 'failed' ? c.dangerText : undefined}
              trailing={<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cal.status === 'failed' ? c.danger : listColors.learning }} />}
              onPress={cal.status === 'failed' ? () => void connectGoogleCalendar().catch(() => {}) : undefined}
            />
            {cal.calendars.map((g) => (
              <SetRow
                key={g.id}
                name={g.name}
                lead={<View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: c.cal.eventDot }} />}
                toggle={g.enabled}
                onPress={() => void setCalendarEnabled(g.id, !g.enabled).catch(() => snack({ title: "Couldn't change that calendar", sub: 'Try again in a moment.' }))}
              />
            ))}
            <SetRow
              name="Disconnect Google Calendar"
              hint="Events disappear from Loop. Tasks stay."
              danger
              last
              onPress={() =>
                sheets.open(
                  () => (
                    <ConfirmDialog
                      title="Disconnect Google Calendar?"
                      body="Events disappear from Loop. Your tasks stay, and nothing changes in Google."
                      confirmLabel="Disconnect"
                      onConfirm={() => void disconnectGoogleCalendar()}
                    />
                  ),
                  'dialog',
                )
              }
            />
          </Card>
        )}

        <GroupLabel style={{ paddingTop: 22, paddingBottom: 8 }}>This phone</GroupLabel>
        <Card>
          <SetRow
            name="Sync"
            hint={
              !session
                ? 'Preview mode, saved on this phone only'
                : state === 'offline'
                  ? 'Offline · changes will sync later'
                  : state === 'syncing' && pending
                    ? `Syncing ${pending} change${pending === 1 ? '' : 's'}…`
                    : state === 'syncing'
                      ? 'Syncing…'
                      : state === 'error'
                        ? "Couldn't sync · retrying"
                        : pending
                          ? `${pending} change${pending === 1 ? '' : 's'} waiting`
                          : `All changes saved${lastSyncedAt ? ` · ${ago(lastSyncedAt)}` : ''}`
            }
            hintColor={state === 'error' ? c.warnText : undefined}
            value={!session ? 'Off' : state === 'syncing' ? undefined : state === 'offline' ? 'Offline' : state === 'error' ? 'Retry' : undefined}
            valueMuted={state !== 'error'}
            trailing={session && state === 'syncing' ? <Spinner /> : undefined}
            onPress={session ? () => void syncNow() : undefined}
          />
          <SetRow
            name="Sign out"
            danger
            last
            onPress={() =>
              sheets.open(
                () => (
                  <ConfirmDialog
                    title="Sign out of Loop?"
                    body="Your tasks and notes stay safe in your account. Sign in again to get them back on this phone."
                    extra={
                      <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21 }}>
                        Check-in notifications stop on this phone until you sign in.
                      </AppText>
                    }
                    confirmLabel="Sign out"
                    onConfirm={signOut}
                  />
                ),
                'dialog',
              )
            }
          />
        </Card>
      </ScrollView>
    </View>
  );
}
