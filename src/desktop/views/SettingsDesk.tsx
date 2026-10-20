import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { SwitchKnob } from '@/components/Switch';
import { useCalendar } from '@/calendar/google';
import { formatTime, minutesToTime, timeToMinutes, type TimeKey } from '@/lib/dates';
import { useAuth } from '@/lib/auth';
import { useLocal } from '@/store/local';
import { useSettings, useTimeFormat } from '@/store/settings';
import { useStore } from '@/store/store';
import { useSyncLine } from '@/sync/status';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/tokens';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { askBrowserPermission, browserPermission } from '../browserNotify';
import { DeskConfirm } from '../Dialog';
import { Kbd } from '../Kbd';
import { useDeskState } from '../state';

type CheckinKind = 'morningTime' | 'afternoonTime' | 'sortTime';
const PICKS: Record<CheckinKind, { title: string; picks: TimeKey[]; fallback: TimeKey }> = {
  morningTime: { title: 'Morning check-in', picks: ['07:30', '08:30', '09:00'], fallback: '08:30' },
  afternoonTime: { title: 'Afternoon check-in', picks: ['13:00', '14:00', '15:30'], fallback: '14:00' },
  sortTime: { title: 'Sort reminder', picks: ['12:00', '18:00', '21:00'], fallback: '18:00' },
};

/** WSettings (two columns), WNotifBlocked, WCheckinTime. */
export function SettingsDesk() {
  const { c, preference, setPreference } = useTheme();
  const sheets = useSheets();
  const { session, preview, signOut } = useAuth();
  const s = useSettings();
  const timeFormat = useTimeFormat();
  const cal = useCalendar();
  const sync = useSyncLine();
  const lists = useStore((st) => st.lists);
  const panelOn = useLocal((l) => l.deskPanel !== false);
  const browserOn = useLocal((l) => l.browserNotify !== false);
  const [perm, setPerm] = useState(browserPermission());
  const name = (session?.user.user_metadata?.full_name as string | undefined) ?? (preview ? 'Preview' : 'You');
  const email = session?.user.email ?? 'Not signed in';
  const live = lists.filter((l) => !l.deletedAt && !l.archivedAt).length;
  const archived = lists.filter((l) => !l.deletedAt && l.archivedAt).length;
  const enabledCals = cal.calendars.filter((x) => x.enabled).length;
  const time = (t: TimeKey | null) => (t ? formatTime(t) : 'Off');

  const pickTime = (kind: CheckinKind, x: number, y: number) => sheets.open(() => <CheckinTimePop kind={kind} />, 'menu', { x, y });
  const at = (fn: (x: number, y: number) => void) => (e: { nativeEvent: unknown }) => {
    const n = e.nativeEvent as { pageX: number; pageY: number };
    fn(n.pageX - 280, n.pageY - 110);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.ground }} contentContainerStyle={{ paddingTop: 30, paddingHorizontal: 36, paddingBottom: 60 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 34, lineHeight: 40, letterSpacing: -0.68 }}>
        Settings
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 20, maxWidth: 1060 }}>
        <View style={{ flex: 1, minWidth: 360, gap: 20 }}>
          <Section cap="Account and Google">
            <Row
              lead={
                <View aria-hidden style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: listColors.purple, alignItems: 'center', justifyContent: 'center' }}>
                  <AppText style={{ ...font(800), fontSize: 16, color: '#FFFFFF' }}>{name.slice(0, 1).toUpperCase()}</AppText>
                </View>
              }
              name={name}
              hint={email}
              right={<AppText style={{ ...font(700), fontSize: 14, color: c.dangerText }}>Sign out</AppText>}
              onPress={() =>
                sheets.open(
                  () => (
                    <DeskConfirm
                      title="Sign out of Loop?"
                      body="Your tasks and notes stay safe in your account. Sign in again to get them back on this computer."
                      confirmLabel="Sign out"
                      onConfirm={() => void signOut()}
                    />
                  ),
                  'dialog',
                )
              }
            />
            <Row
              name="Google Calendar"
              hint={cal.status === 'off' || cal.status === 'connecting' ? 'Not connected · read-only' : `Connected · ${enabledCals} of ${cal.calendars.length} calendars shown · read-only`}
              right={<AppText style={{ ...font(700), fontSize: 15, color: c.accentText }}>{cal.status === 'off' ? 'Connect' : 'Manage'}</AppText>}
              onPress={() => router.push('/settings/account')}
            />
            <Row name="Sync" hint={sync.line} last />
          </Section>

          <Section cap="Daily check-ins">
            <Row name="Morning" hint="On this computer: a card on Today, no pop-up" value={time(s.morningTime)} muted={!s.morningTime} onPress={at((x, y) => pickTime('morningTime', x, y))} />
            <Row name="Afternoon" hint="Only if something is still open" value={time(s.afternoonTime)} muted={!s.afternoonTime} onPress={at((x, y) => pickTime('afternoonTime', x, y))} />
            {perm === 'denied' ? (
              <View style={{ paddingVertical: 10, paddingLeft: 20, paddingRight: 18, borderBottomWidth: 1, borderBottomColor: c.ground }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 }}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ ...font(700), fontSize: 15.5 }}>Browser notifications</AppText>
                    <AppText style={{ ...font(700), fontSize: 13, marginTop: 2, color: c.dangerText }}>Blocked by your browser</AppText>
                  </View>
                  <View style={{ opacity: 0.5 }}>
                    <SwitchKnob on={false} />
                  </View>
                </View>
                <View style={{ marginTop: 6, marginBottom: 4, padding: 12, borderRadius: 14, backgroundColor: c.dangerTint }}>
                  <AppText style={{ fontSize: 13.5, lineHeight: 20, color: c.dangerText }}>
                    To turn them on, click the lock or settings icon next to the address bar, set <AppText style={{ ...font(800), fontSize: 13.5, color: c.dangerText }}>Notifications</AppText> to{' '}
                    <AppText style={{ ...font(800), fontSize: 13.5, color: c.dangerText }}>Allow</AppText>, then reload Loop. Until then, check-ins show only as a card on Today.
                  </AppText>
                </View>
              </View>
            ) : perm !== 'unsupported' ? (
              <Row
                name="Browser notifications"
                hint="When Loop is open in a tab but you're elsewhere"
                toggle={perm === 'granted' && browserOn}
                onPress={async () => {
                  if (perm !== 'granted') setPerm(await askBrowserPermission());
                  else useLocal.setState({ browserNotify: !browserOn });
                }}
              />
            ) : null}
            <Row name="On weekends" toggle={s.weekends} last onPress={() => s.set({ weekends: !s.weekends })} />
          </Section>
        </View>

        <View style={{ flex: 1, minWidth: 360, gap: 20 }}>
          <Section cap="Inbox and lists">
            <Row name="Sort reminder" hint="Only when there are notes" value={time(s.sortTime)} muted={!s.sortTime} onPress={at((x, y) => pickTime('sortTime', x, y))} />
            <Row name="Lists" hint="Order, colours, archived" value={`${live}${archived ? ` · ${archived} archived` : ''}`} plainValue last onPress={() => router.push('/settings/lists')} />
          </Section>

          <Section cap="Look and time">
            <Row
              name="Theme"
              right={
                <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: c.cal.segBg }}>
                  {(['light', 'dark', 'system'] as ThemePreference[]).map((p) => {
                    const on = preference === p;
                    return (
                      <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setPreference(p)} style={{ minHeight: 30, paddingHorizontal: 10, borderRadius: 9, backgroundColor: on ? c.card : 'transparent', justifyContent: 'center' }}>
                        <AppText style={{ ...font(on ? 700 : 600), fontSize: 13.5, color: on ? c.text : c.textSecondary }}>{p === 'system' ? 'System' : p[0].toUpperCase() + p.slice(1)}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
              }
            />
            <Row name="Week starts on" value={s.weekStart === 0 ? 'Sunday' : 'Monday'} onPress={() => s.set({ weekStart: s.weekStart === 0 ? 1 : 0 })} />
            <Row name="Clock" value={timeFormat === '24h' ? '24-hour' : '12-hour'} onPress={() => s.set({ timeFormat: timeFormat === '24h' ? '12h' : '24h', timeFormatChosen: true })} />
            <Row name="Detail panel" hint="Show the selected task on the right" toggle={panelOn} last onPress={() => useLocal.setState({ deskPanel: !panelOn })} />
          </Section>

          <Section cap="Help">
            <Row name="Keyboard shortcuts" right={<Kbd k="?" />} onPress={() => useDeskState.setState({ overlay: 'shortcuts' })} />
            <Row name="Replay the tutorial" right={<AppText style={{ ...font(800), fontSize: 15, color: c.accentText }}>›</AppText>} last onPress={() => useDeskState.setState({ overlay: 'welcome' })} />
          </Section>
        </View>
      </View>
    </ScrollView>
  );
}

function Section({ cap, children }: { cap: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View>
      <AppText accessibilityRole="header" style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 10 }}>
        {cap}
      </AppText>
      <View style={{ backgroundColor: c.card, borderRadius: 20, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function Row({
  name,
  hint,
  value,
  muted,
  plainValue,
  toggle,
  right,
  lead,
  last,
  onPress,
}: {
  name: string;
  hint?: string;
  value?: string;
  muted?: boolean;
  plainValue?: boolean;
  toggle?: boolean;
  right?: ReactNode;
  lead?: ReactNode;
  last?: boolean;
  onPress?: (e: { nativeEvent: unknown }) => void;
}) {
  const { c } = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole={toggle !== undefined ? 'switch' : onPress ? 'button' : undefined}
      accessibilityState={toggle !== undefined ? { checked: toggle } : undefined}
      accessibilityLabel={[name, hint, value].filter(Boolean).join(', ')}
      disabled={!onPress}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingLeft: 20, paddingRight: 18, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.ground, backgroundColor: hover && onPress ? c.desk.hover : 'transparent' }}
    >
      {lead}
      <View style={{ flex: 1 }}>
        <AppText style={{ ...font(700), fontSize: 15.5 }}>{name}</AppText>
        {hint ? (
          <AppText tone="secondary" style={{ ...font(500), fontSize: 13, marginTop: 2 }}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? <AppText style={{ ...font(700), fontSize: 15, color: muted || plainValue ? c.textSecondary : c.accentText, fontVariant: ['tabular-nums'] }}>{value}</AppText> : null}
      {toggle !== undefined ? <SwitchKnob on={toggle} /> : null}
      {right}
    </Pressable>
  );
}

/** WCheckinTime: quick picks, a typed time (↑ / ↓ change it by 15 minutes), Turn off / Save. */
function CheckinTimePop({ kind }: { kind: CheckinKind }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const current = useSettings((s) => s[kind]);
  const set = useSettings((s) => s.set);
  const cfg = PICKS[kind];
  const [value, setValue] = useState<TimeKey>(current ?? cfg.fallback);
  const [text, setText] = useState(formatTime(current ?? cfg.fallback));
  const choose = (t: TimeKey) => {
    setValue(t);
    setText(formatTime(t));
  };
  const parse = (raw: string): TimeKey | null => {
    const m = raw.trim().toLowerCase().match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/);
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    if (h > 23 || min > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };
  const save = () => {
    const t = parse(text) ?? value;
    set({ [kind]: t });
    close();
  };
  return (
    <View accessibilityRole="dialog" accessibilityLabel={cfg.title} style={{ width: 300, backgroundColor: c.card, borderWidth: 1, borderColor: c.desk.border, borderRadius: 18, padding: 16, gap: 12 }}>
      <AppText style={{ ...font(800), fontSize: 15 }}>{cfg.title}</AppText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {cfg.picks.map((p) => {
          const on = p === value;
          return (
            <Pressable key={p} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => choose(p)} style={{ flex: 1, minHeight: 36, borderRadius: 11, backgroundColor: on ? c.accent : c.ground, alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ ...font(700), fontSize: 14, color: on ? c.onAccent : c.text }}>{formatTime(p)}</AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: c.accent }}>
        <TextInput
          autoFocus
          value={text}
          onChangeText={setText}
          onSubmitEditing={save}
          onKeyPress={(e) => {
            const k = e.nativeEvent.key;
            if (k !== 'ArrowUp' && k !== 'ArrowDown') return;
            (e as unknown as { preventDefault: () => void }).preventDefault();
            const base = parse(text) ?? value;
            const next = minutesToTime((timeToMinutes(base) + (k === 'ArrowUp' ? 15 : -15) + 24 * 60) % (24 * 60));
            choose(next);
          }}
          accessibilityLabel="Time"
          accessibilityHint="Up and down change it by 15 minutes"
          style={[{ flex: 1, ...font(800), fontSize: 18, color: c.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
        />
        <AppText tone="secondary" style={{ fontSize: 13 }}>
          ↑↓
        </AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            set({ [kind]: null });
            close();
          }}
          style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.ground, justifyContent: 'center' }}
        >
          <AppText style={{ ...font(700), fontSize: 13.5, color: c.dangerText }}>Turn off</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={save} style={{ flex: 1, minHeight: 40, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <AppText style={{ ...font(800), fontSize: 14, color: c.onAccent }}>Save</AppText>
        </Pressable>
      </View>
    </View>
  );
}
