import { useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { useCloseSheet } from '@/components/Sheet';
import { useSnackbar } from '@/components/Snackbar';
import { formatTime, timeToMinutes, type TimeKey } from '@/lib/dates';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { Kbd } from './Kbd';

/** What the coach is sent and what it never is (docs/13 §6.3). The same lists are used on the phone sheet. */
export const COACH_SENT = [
  'Task titles, dates, times, priority and how often a task was carried over',
  'List names and their season tier',
  'Google Calendar event times and titles for today',
  'What you type in the season setup chat',
];
export const COACH_NEVER_SENT = ['Task notes', 'The Notes section and the Inbox', 'Tags', 'Your name or email'];
export const COACH_DATA_LINE = 'Sent to Google Gemini on its free plan. Google may use it to improve its products, and people at Google may review it.';

function Bullets({ items, tone }: { items: string[]; tone: 'sent' | 'never' }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="list" style={{ gap: 6 }}>
      {items.map((text) => (
        <View key={text} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <AppText aria-hidden style={{ ...font(800), fontSize: 14, lineHeight: 21, width: 12, textAlign: 'center', color: tone === 'sent' ? c.accentText : c.textSecondary }}>
            {tone === 'sent' ? '•' : '×'}
          </AppText>
          <AppText style={{ flex: 1, fontSize: 14, lineHeight: 21 }}>{text}</AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * CCoachPrivacy on the computer. The first time it asks before turning the coach on;
 * later ("What the coach sees") it shows the same text with a way to turn it off.
 */
export function CoachPrivacyDialog() {
  const { c } = useTheme();
  const close = useCloseSheet();
  const snack = useSnackbar();
  const on = useSettings((s) => s.coachEnabled);
  const set = useSettings((s) => s.set);
  const cap = (text: string) => (
    <AppText accessibilityRole="header" style={{ ...font(700), fontSize: 12.5, letterSpacing: 0.5, textTransform: 'uppercase', color: c.textSecondary }}>
      {text}
    </AppText>
  );
  return (
    <View accessibilityRole="alert" style={{ width: 500, maxWidth: '100%', maxHeight: '100%', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border, padding: 26, gap: 16 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>
        {on ? 'What the coach sees' : 'Before you turn on the coach'}
      </AppText>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14 }}>
        <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22 }}>
          The coach suggests a plan for your day and helps you set up a season. It only suggests. Nothing changes until you accept it.
        </AppText>
        {cap('Sent to the coach')}
        <Bullets items={COACH_SENT} tone="sent" />
        {cap('Never sent')}
        <Bullets items={COACH_NEVER_SENT} tone="never" />
        <View style={{ padding: 14, borderRadius: 14, backgroundColor: c.ground }}>
          <AppText style={{ fontSize: 13.5, lineHeight: 20 }}>{COACH_DATA_LINE}</AppText>
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        {on ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              close();
              set({ coachEnabled: false });
              snack({ title: 'Coach turned off', actions: [{ label: 'Undo', onPress: () => set({ coachEnabled: true }) }] });
            }}
            style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.ground, justifyContent: 'center', marginRight: 'auto' }}
          >
            <AppText style={{ ...font(800), fontSize: 14.5, color: c.dangerText }}>Turn off coach</AppText>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={close} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: on ? c.accent : c.ground }}>
          <AppText style={{ ...font(800), fontSize: 14.5, color: on ? c.onAccent : c.text }}>{on ? 'Close' : 'Not now'}</AppText>
          {on ? null : <Kbd k="Esc" />}
        </Pressable>
        {on ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              close();
              set({ coachEnabled: true, coachConsentAt: new Date().toISOString() });
              snack({ title: 'Coach turned on' });
            }}
            style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.accent, justifyContent: 'center' }}
          >
            <AppText style={{ ...font(800), fontSize: 14.5, color: c.onAccent }}>Turn on coach</AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const parseTime = (raw: string): TimeKey | null => {
  const m = raw.trim().toLowerCase().match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

/** MacPlanWindow: "Plan my day between", From and To. The coach only suggests times inside it. */
export function PlanWindowDialog() {
  const { c } = useTheme();
  const close = useCloseSheet();
  const start = useSettings((s) => s.planStart);
  const end = useSettings((s) => s.planEnd);
  const set = useSettings((s) => s.set);
  const [from, setFrom] = useState(formatTime(start));
  const [to, setTo] = useState(formatTime(end));
  const a = parseTime(from);
  const b = parseTime(to);
  const problem = !a || !b ? 'Type times like 9:00 or 6pm.' : timeToMinutes(b) <= timeToMinutes(a) ? 'The end time has to be after the start time.' : null;
  const save = () => {
    if (problem || !a || !b) return;
    set({ planStart: a, planEnd: b });
    close();
  };
  const field = (label: string, value: string, onChange: (t: string) => void, autoFocus?: boolean) => (
    <View style={{ flex: 1, gap: 6 }}>
      <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
        {label}
      </AppText>
      <View style={{ minHeight: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: c.line, justifyContent: 'center' }}>
        <TextInput
          autoFocus={autoFocus}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={save}
          accessibilityLabel={label}
          style={[{ ...font(800), fontSize: 18, color: c.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
        />
      </View>
    </View>
  );
  return (
    <View accessibilityRole="alert" style={{ width: 420, maxWidth: '100%', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border, padding: 26, gap: 16 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>
        Plan my day between
      </AppText>
      <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22 }}>
        The coach only suggests times inside these hours.
      </AppText>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {field('From', from, setFrom, true)}
        {field('To', to, setTo)}
      </View>
      {problem ? (
        <AppText accessibilityLiveRegion="polite" style={{ ...font(600), fontSize: 13.5, color: c.dangerText }}>
          {problem}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={close} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.ground }}>
          <AppText style={{ ...font(800), fontSize: 14.5 }}>Cancel</AppText>
          <Kbd k="Esc" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!problem }} disabled={!!problem} onPress={save} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.accent, justifyContent: 'center', opacity: problem ? 0.5 : 1 }}>
          <AppText style={{ ...font(800), fontSize: 14.5, color: c.onAccent }}>{a && b && !problem ? `Save ${formatTime(a)} – ${formatTime(b)}` : 'Save'}</AppText>
        </Pressable>
      </View>
    </View>
  );
}
