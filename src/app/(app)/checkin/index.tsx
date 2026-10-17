import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoopAlarm from '../../../../modules/loop-alarm';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { goMain } from '@/features/nav';
import { useSheets } from '@/components/Sheet';
import { CarriedOverSheet } from '@/features/sheets/CarriedOverSheet';
import { finishCheckin } from '@/features/checkin';
import { applyChoices, leftovers, type Choice } from '@/lib/checkins';
import { daysBetween, shortDate, todayKey } from '@/lib/dates';
import { isOpen, movedLabel, visibleTasks } from '@/lib/taskViews';
import type { Task } from '@/store/types';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** VCheckIn: the full-screen morning check-in. Also shown over the lock screen by the full-screen alert. */
export default function CheckIn() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sheets = useSheets();
  // A task moved twice already: this move would be its 3rd, so it can open NCarriedOver.
  const moved = (t: Task) => t.carriedOverCount >= 2;
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const today = todayKey();
  const left = leftovers(tasks, lists, today);
  const todayCount = visibleTasks(tasks, lists).filter((t) => isOpen(t) && t.dueDate === today).length;

  useEffect(() => {
    void LoopAlarm?.setShowWhenLocked(true);
    return () => void LoopAlarm?.setShowWhenLocked(false);
  }, []);

  const all = (choice: Choice) => {
    const { next, prev } = applyChoices(tasks, Object.fromEntries(left.map((t) => [t.id, choice])), today, new Date().toISOString());
    finishCheckin(next, prev);
  };
  const fromYesterday = left.every((t) => t.dueDate && daysBetween(t.dueDate, today) === 1);

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: 24 + insets.top, paddingBottom: 28 + insets.bottom, paddingHorizontal: size.sideMargin }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText tone="secondary" style={{ ...font(600), fontSize: 14 }}>
          Morning check-in · {shortDate(today)}
        </AppText>
        <PressScale accessibilityRole="button" accessibilityLabel="Close check-in" onPress={() => goMain('/')} style={{ width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" color={c.text} />
        </PressScale>
      </View>

      {left.length === 0 ? (
        <>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start', gap: 14, paddingBottom: 40 }}>
            <View aria-hidden style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={34} strokeWidth={2.6} color={c.onAccent} />
            </View>
            <AppText accessibilityRole="header" style={{ marginTop: 10, ...font(800), fontSize: 32, lineHeight: 38, letterSpacing: -0.64 }}>
              Nothing left over
            </AppText>
            <AppText tone="secondary" style={{ fontSize: 16, lineHeight: 25 }}>
              {`Yesterday is wrapped up. Today you have ${todayCount} task${todayCount === 1 ? '' : 's'}.`}
            </AppText>
          </View>
          <Primary label="Go to Today" onPress={() => goMain('/')} />
        </>
      ) : (
        <>
          <AppText variant="title" accessibilityRole="header" style={{ marginTop: 18, letterSpacing: -0.64 }}>
            {left.length} task{left.length === 1 ? '' : 's'} left {fromYesterday ? 'from yesterday' : 'over'}
          </AppText>
          <AppText tone="secondary" style={{ marginTop: 10, fontSize: 16 }}>
            What should we do with {left.length === 1 ? 'it' : 'them'}?
          </AppText>
          <ScrollView style={{ marginTop: 24, flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ backgroundColor: c.card, borderRadius: 22, overflow: 'hidden' }}>
            {left.map((t, i) => {
              const late = daysBetween(t.dueDate!, today);
              const list = lists.find((l) => l.id === t.listId)?.name;
              return (
                <PressScale
                  key={t.id}
                  kind="row"
                  disabled={!moved(t)}
                  accessibilityRole={moved(t) ? 'button' : undefined}
                  accessibilityHint={moved(t) ? 'Asks where this task should live' : undefined}
                  onPress={() => sheets.open(() => <CarriedOverSheet taskId={t.id} />)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: i < left.length - 1 ? 1 : 0, borderBottomColor: c.ground }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText style={{ ...font(700), fontSize: 15.5 }}>{t.title}</AppText>
                    <AppText tone="secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
                      {[list, late === 1 ? 'was due yesterday' : `${late} days late`].filter(Boolean).join(' · ')}
                      {moved(t) ? <AppText style={{ fontSize: 13.5, color: c.warnText }}>{` · ${movedLabel(t.carriedOverCount)}`}</AppText> : null}
                    </AppText>
                  </View>
                  {moved(t) ? <Icon name="forward" size={18} color={c.line} /> : null}
                </PressScale>
              );
            })}
          </ScrollView>
          <View style={{ flex: 1, minHeight: 20 }} />
          <View style={{ gap: 10 }}>
            <Primary label="Move all to today" onPress={() => all('today')} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Secondary label="Reschedule" onPress={() => router.push('/checkin/reschedule')} />
              <Secondary label="Mark all done" onPress={() => all('done')} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Secondary label="Archive all" hint="Keeps them in their lists without a date" onPress={() => all('someday')} />
              <Secondary label="Not now" plain onPress={() => goMain('/')} />
            </View>
          </View>
          <AppText tone="secondary" style={{ marginTop: 14, fontSize: 13.5, textAlign: 'center' }}>
            Today you have {todayCount} task{todayCount === 1 ? '' : 's'}
          </AppText>
        </>
      )}
    </View>
  );
}

function Primary({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale accessibilityRole="button" onPress={onPress} style={{ minHeight: 58, borderRadius: radius.button, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <AppText variant="button" tone="onAccent">
        {label}
      </AppText>
    </PressScale>
  );
}

function Secondary({ label, hint, plain, onPress }: { label: string; hint?: string; plain?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityHint={hint}
      onPress={onPress}
      style={{ flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: plain ? 'transparent' : c.card, alignItems: 'center', justifyContent: 'center' }}
    >
      <AppText style={{ ...font(700), fontSize: 15, color: plain ? c.textSecondary : c.text }}>{label}</AppText>
    </PressScale>
  );
}
