import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Check } from '@/components/Check';
import { Icon, type IconName } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { pushSnack } from '@/components/Snackbar';
import { Spinner } from '@/components/Spinner';
import { useCalendar } from '@/calendar/google';
import { COACH_FAILURE_COPY } from '@/features/coach/api';
import { acceptSuggestions, dismissPlan, editSuggestion, planRow, retryPlan, runPlan, useAutoPlan, useDayPlan, usePlanRun, type PlanRowView } from '@/features/coach/useDayPlan';
import { SeasonLine } from '@/features/season/parts';
import { goMain } from '@/features/nav';
import { useTaskActions } from '@/features/useTaskActions';
import { applyChoices, leftovers, type Choice } from '@/lib/checkins';
import { clashOf, dayWord, suggestionLabel, whenText, type Suggestion } from '@/lib/coachPlan';
import { addDays, daysBetween, formatTime, longDate, monthDay, timeRange, timeToMinutes, toKey, weekdayShort, type DateKey, type TimeKey } from '@/lib/dates';
import { closingAnswers, endedSeasonToShow, yesterdayRange, yesterdaySummary } from '@/lib/debrief';
import { eventEnd, eventsOn, eventStart } from '@/lib/events';
import { activeSeason, coreNote, groupByTier } from '@/lib/seasons';
import { movedLabel } from '@/lib/taskViews';
import { useToday } from '@/lib/useToday';
import { useLocal } from '@/store/local';
import { useSettings } from '@/store/settings';
import { useStore } from '@/store/store';
import type { LeftoversAction, Task } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { Kbd, KeyHints } from '../Kbd';
import { modKey } from '../platform';
import { useDeskState } from '../state';
import { TaskPanel } from '../TaskPanel';
import { DeskCard, DeskHeader, DeskPage, KeyButton, SoftButton } from '../ui';
import { useViewKeys } from '../useDeskKeys';

// WCDebrief (docs/13 §2.2 and §8, docs/14 D): the morning debrief in the main column.
// Yesterday, Left over, Today's plan from the coach, the season line, and the one-time season offer.

const isoDay = (iso: string) => toKey(new Date(iso));
const kindIcon: Record<Suggestion['kind'], IconName> = { schedule: 'clock', today: 'sun', later: 'arrowRight' };

// ─── Leftovers (the same actions as the check-in, docs/13 §2.2) ───

type Handled = { text: string; undo?: () => void };
/** What the collapsed Left over line says after a reload, when this session didn't see the action. */
const HANDLED_COPY: Record<LeftoversAction, string> = {
  today: 'Moved to today',
  done: 'Marked done',
  archive: 'Archived',
  reschedule: 'Decided one by one',
  not_now: 'Left for tomorrow',
  notif_today: 'Moved to today from the notification',
  notif_done: 'Marked done from the notification',
};

/** One leftover decided in the panel: Today, Tomorrow, a day, or done. Counts as answering the debrief. */
export function decideLeftover(id: string, choice: Choice, label: string) {
  const today = todayNow();
  const { next, prev } = applyChoices(useStore.getState().tasks, { [id]: choice }, today, new Date().toISOString());
  useStore.getState().applyCheckin(next);
  useStore.getState().answerDebrief(today, 'reschedule');
  pushSnack({ title: label, actions: [{ label: 'Undo', onPress: () => useStore.getState().applyCheckin(prev) }] });
  // Move on to the next leftover, or back to the empty panel.
  const left = leftovers(useStore.getState().tasks, useStore.getState().lists, today);
  useDeskState.setState({ selected: left[0] ? { kind: 'leftover', id: left[0].id } : null });
}
const todayNow = () => toKey(new Date());

export function DebriefDesk() {
  const { c } = useTheme();
  const { today } = useToday();
  const tasks = useStore((s) => s.tasks);
  const lists = useStore((s) => s.lists);
  const seasons = useStore((s) => s.seasons);
  const debriefs = useStore((s) => s.debriefs);
  const weekends = useSettings((s) => s.weekends);
  const selected = useDeskState((s) => s.selected);
  const local = useLocal();
  const [handled, setHandled] = useState<Handled | null>(null);

  const left = leftovers(tasks, lists, today);
  const range = yesterdayRange(today, weekends);
  const y = yesterdaySummary(tasks, range, isoDay);
  const action = debriefs.find((d) => d.day === today && d.leftoversAction)?.leftoversAction ?? null;
  const plan = useDayPlan(today);
  useAutoPlan(today, plan);

  // Opening marks the debrief opened; closing it answers only on a quiet morning after a real look (docs/13 §2.2).
  const hadLeftovers = useRef(left.length > 0);
  useEffect(() => {
    useStore.getState().openDebrief(today);
    const at = Date.now();
    const had = hadLeftovers.current;
    return () => {
      if (closingAnswers(had, at, Date.now())) useStore.getState().answerDebrief(today);
      const sel = useDeskState.getState().selected;
      if (sel?.kind === 'suggestion' || sel?.kind === 'leftover') useDeskState.setState({ selected: null });
    };
  }, [today]);

  const season = activeSeason(seasons, today);
  const note = season ? coreNote(season, lists, tasks, today, isoDay) : null;
  const ended = endedSeasonToShow(seasons, today, local.seasonEndedDismissed ?? []);
  const firstUse = lists.map((l) => l.createdAt).filter(Boolean).sort()[0];
  const offer = !seasons.length && !local.seasonOfferDone && !!firstUse && daysBetween(isoDay(firstUse), today) >= 7;

  const all = (choice: Choice, act: LeftoversAction, text: string) => {
    const { next, prev } = applyChoices(useStore.getState().tasks, Object.fromEntries(left.map((t) => [t.id, choice])), today, new Date().toISOString());
    useStore.getState().applyCheckin(next);
    useStore.getState().answerDebrief(today, act);
    const undo = () => {
      useStore.getState().applyCheckin(prev);
      setHandled(null);
    };
    setHandled({ text, undo });
    pushSnack({ title: text, actions: [{ label: 'Undo', onPress: undo }] });
  };
  const n = left.length;
  const moveAll = () => all('today', 'today', `Moved ${n} to today`);
  const notNow = () => {
    useStore.getState().answerDebrief(today, 'not_now');
    setHandled({ text: 'Left for tomorrow' });
  };

  // Keys (docs/13 §8): ↑ ↓ move, A accepts the focused suggestion, ⇧A accepts all, Esc back to Today.
  const openIds = plan.state === 'ready' ? plan.open.map((r) => r.s.taskId) : [];
  const showLeft = n > 0 && action !== 'not_now' && !handled;
  const focusable = [...(showLeft ? left.map((t) => ({ kind: 'leftover' as const, id: t.id })) : []), ...openIds.map((id) => ({ kind: 'suggestion' as const, id }))];
  useViewKeys((k, e) => {
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      if (!focusable.length) return false;
      const i = focusable.findIndex((f) => selected && f.kind === selected.kind && f.id === (selected as { id: string }).id);
      const next = k === 'ArrowDown' ? Math.min(focusable.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1);
      useDeskState.setState({ selected: focusable[next] });
      return true;
    }
    if (k === 'a' && e.shiftKey && openIds.length) return acceptSuggestions(today, openIds), true;
    if (k === 'a' && selected?.kind === 'suggestion') return acceptSuggestions(today, [selected.id]), true;
    if (k === 'Escape') {
      if (selected) useDeskState.setState({ selected: null });
      else goMain('/');
      return true;
    }
    return false;
  });

  return (
    <DeskPage>
      <DeskHeader pre={longDate(today)} title="Good morning" actions={<SoftButton label="See Today" k="Esc" onPress={() => goMain('/')} />} />

      <SectionHead first>{range.label}</SectionHead>
      <DeskCard style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 20 }}>
        {y.count ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <AppText style={{ ...font(800), fontSize: 28, lineHeight: 32 }}>{String(y.count)}</AppText>
              <AppText style={{ ...font(700), fontSize: 15 }}>{y.count === 1 ? 'task finished' : 'tasks finished'}</AppText>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4 }}>
              {y.titles.map((t) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 260 }}>
                  <View aria-hidden style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={11} strokeWidth={3} color={c.onAccent} />
                  </View>
                  <AppText tone="secondary" numberOfLines={1} style={{ fontSize: 14 }}>
                    {t}
                  </AppText>
                </View>
              ))}
              {y.more ? <TextLink label={`+${y.more} more`} onPress={() => goMain('/completed')} /> : null}
            </View>
          </>
        ) : (
          <AppText tone="secondary" style={{ fontSize: 15 }}>
            {y.line}
          </AppText>
        )}
      </DeskCard>

      {showLeft ? (
        <>
          <SectionHead>{`Left over · ${n}`}</SectionHead>
          <DeskCard>
            {left.map((t, i) => (
              <LeftoverRow key={t.id} task={t} today={today} listName={lists.find((l) => l.id === t.listId)?.name} last={i === n - 1} />
            ))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.ground }}>
              <KeyButton small icon={null} label="Move all to today" onPress={moveAll} />
              <SoftButton onCard label="Reschedule…" onPress={() => useDeskState.setState({ selected: { kind: 'leftover', id: left[0].id } })} />
              <SoftButton onCard label="Mark all done" onPress={() => all('done', 'done', `Marked ${n} done`)} />
              <SoftButton onCard label="Archive all" onPress={() => all('someday', 'archive', `Archived ${n}`)} />
              <View style={{ flex: 1 }} />
              <TextLink label="Not now" tone="secondary" onPress={notNow} />
            </View>
          </DeskCard>
        </>
      ) : handled || action ? (
        <>
          <SectionHead>Left over</SectionHead>
          <DoneLine text={handled?.text ?? HANDLED_COPY[action!]} action={handled?.undo ? { label: 'Undo', onPress: handled.undo } : undefined} />
        </>
      ) : null}

      <PlanSection today={today} />

      {ended ? (
        <>
          <SectionHead>Season</SectionHead>
          <View style={{ backgroundColor: c.tint, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 20, gap: 6 }}>
            <AppText style={{ ...font(800), fontSize: 16 }}>{`Your season ended on ${monthDay(ended.endDate)}.`}</AppText>
            {groupByTier(lists, ended).core.length ? (
              <AppText tone="secondary" style={{ fontSize: 14 }}>{`Core was ${groupByTier(lists, ended).core.map((l) => l.name).join(', ')}.`}</AppText>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <KeyButton small icon={null} label="Start a new season" onPress={() => router.push('/season/manual')} />
              <TextLink label="Not now" tone="secondary" onPress={() => useLocal.setState({ seasonEndedDismissed: [...(local.seasonEndedDismissed ?? []), ended.id] })} />
            </View>
          </View>
        </>
      ) : season ? (
        <>
          <SectionHead>Season</SectionHead>
          <SeasonLine season={season} today={today} note={note} onPress={() => goMain('/season')} />
        </>
      ) : null}

      {offer ? (
        <View style={{ marginTop: 28, backgroundColor: c.card, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View aria-hidden style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="flag" size={20} color={c.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ ...font(800), fontSize: 15.5 }}>Pick what matters for the next 12 weeks?</AppText>
            {/* The coach chat comes later; until then Start a season opens the form, so the copy says so. */}
            <AppText tone="secondary" style={{ fontSize: 14, marginTop: 2 }}>
              Mark a few core lists. Everything else stays as it is.
            </AppText>
          </View>
          <KeyButton
            small
            icon={null}
            label="Start a season"
            onPress={() => {
              useLocal.setState({ seasonOfferDone: true });
              router.push('/season/manual');
            }}
          />
          <TextLink label="Not now" tone="secondary" onPress={() => useLocal.setState({ seasonOfferDone: true })} />
        </View>
      ) : null}

      <KeyHints
        style={{ marginTop: 28 }}
        items={[
          [['↑', '↓'], 'move'],
          [['A'], 'accept'],
          [['⇧', 'A'], 'accept all'],
          [[modKey, 'Z'], 'undo'],
          [['Esc'], 'See Today'],
        ]}
      />
    </DeskPage>
  );
}

// ─── Parts ───

function SectionHead({ children, first, coach, right }: { children: string; first?: boolean; coach?: boolean; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: first ? 24 : 28, paddingBottom: 10, minHeight: 34 }}>
      {coach ? (
        <View accessibilityLabel="Coach" accessibilityRole="image">
          <Icon name="coach" size={16} strokeWidth={2.2} color={c.accentText} />
        </View>
      ) : null}
      <AppText accessibilityRole="header" style={{ ...font(700), fontSize: 14, color: c.textSecondary, flex: 1 }}>
        {children}
      </AppText>
      {right}
    </View>
  );
}

function TextLink({ label, onPress, tone = 'accent', disabled, hint }: { label: string; onPress: () => void; tone?: 'accent' | 'secondary'; disabled?: boolean; hint?: string }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={hint}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
    >
      <AppText style={{ ...font(700), fontSize: 14, color: disabled ? c.textSecondary : tone === 'accent' ? c.accentText : c.textSecondary }}>{label}</AppText>
    </PressScale>
  );
}

/** A collapsed section: "Moved 3 to today · Undo" on the tint, 56 px. */
function DoneLine({ text, action, extra }: { text: string; action?: { label: string; onPress: () => void }; extra?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingLeft: 18, paddingRight: 12, borderRadius: 18, backgroundColor: c.tint }}>
      <View aria-hidden style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={14} strokeWidth={3} color={c.onAccent} />
      </View>
      <AppText style={{ ...font(700), fontSize: 15, flex: 1 }}>{text}</AppText>
      {extra}
      {action ? <TextLink label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

function LeftoverRow({ task, today, listName, last }: { task: Task; today: DateKey; listName?: string; last: boolean }) {
  const { c } = useTheme();
  const selected = useDeskState((s) => s.selected?.kind === 'leftover' && s.selected.id === task.id);
  const [hover, setHover] = useState(false);
  const moved = task.carriedOverCount >= 2;
  const late = task.dueDate ? daysBetween(task.dueDate, today) : 0;
  const from = task.dueDate ? (late === 1 ? `From ${weekdayShort(task.dueDate)}` : `${late} days late`) : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityHint="Opens it in the panel to pick a day"
      onPress={() => useDeskState.setState({ selected: { kind: 'leftover', id: task.id } })}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingLeft: 18, paddingRight: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.ground, backgroundColor: selected ? c.tint : hover ? c.desk.hover : 'transparent', cursor: 'pointer' } as object}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText numberOfLines={1} style={{ ...font(700), fontSize: 15 }}>
          {task.title}
        </AppText>
        <AppText numberOfLines={1} style={{ fontSize: 13, marginTop: 2, color: moved ? c.warnText : c.textSecondary }}>
          {[from, listName, moved ? movedLabel(task.carriedOverCount) : null].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <Check done={false} priority={task.priority} label={task.title} onToggle={() => decideLeftover(task.id, 'done', 'Task done')} />
    </Pressable>
  );
}

// ─── Today's plan (docs/14 A5, A6) ───

function PlanSection({ today }: { today: DateKey }) {
  const { c } = useTheme();
  const view = useDayPlan(today);
  const undo = usePlanRun((s) => s.undo);
  if (view.state === 'off') return null;

  const again =
    view.state === 'ready' && view.note !== 'limit' ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {view.loading ? <Spinner size={14} /> : null}
        <TextLink
          label={view.runsLeft ? 'Plan again' : 'Plan again tomorrow'}
          disabled={!view.runsLeft || view.loading}
          hint={view.runsLeft ? `${view.runsLeft} left today` : undefined}
          onPress={() => void runPlan(true)}
        />
      </View>
    ) : null;

  const quiet = (text: string, extra?: ReactNode) => (
    <DeskCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 14, paddingHorizontal: 20 }}>
      <AppText accessibilityLiveRegion="polite" tone="secondary" style={{ fontSize: 15, flex: 1 }}>
        {text}
      </AppText>
      {extra}
    </DeskCard>
  );

  let body: ReactNode;
  switch (view.state) {
    case 'waiting':
      body = quiet('Sort the leftovers first, then I’ll plan your day.');
      break;
    case 'nothing':
      body = quiet('Nothing on for today. Enjoy the space.');
      break;
    case 'loading':
      body = (
        <DeskCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 20 }}>
          <Spinner size={18} />
          <AppText accessibilityLiveRegion="polite" style={{ fontSize: 16 }}>
            Planning your day…
          </AppText>
        </DeskCard>
      );
      break;
    case 'failed':
      body = quiet(
        view.reason === 'busy' || view.reason === 'timeout' || view.reason === 'bad_answer' || view.reason === 'not_configured' ? 'Couldn’t plan right now.' : COACH_FAILURE_COPY[view.reason],
        view.reason === 'limit' || view.reason === 'off' || view.reason === 'signed_out' || view.reason === 'offline' ? null : <TextLink label="Try again" onPress={retryPlan} />,
      );
      break;
    case 'dismissed':
      body = quiet('No plan today', <TextLink label="Show plan" onPress={() => dismissPlan(today, false)} />);
      break;
    case 'ready':
      if (view.allAccepted) {
        body = <DoneLine text="Plan added to Today" action={undo ? { label: 'Undo', onPress: undo } : undefined} extra={<TextLink label="See Today" onPress={() => goMain('/')} />} />;
        break;
      }
      body = (
        <DeskCard>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20 }}>
            <View style={{ flex: 1, minWidth: 240 }}>
              <AppText accessibilityLiveRegion="polite" style={{ fontSize: 16, lineHeight: 23 }}>
                {view.plan.summary}
              </AppText>
              {view.note && view.note !== 'nothing' ? (
                <AppText tone="secondary" style={{ fontSize: 13, marginTop: 4 }}>
                  {view.note === 'limit' ? COACH_FAILURE_COPY.limit : view.note === 'offline' ? 'Offline · showing the plan from earlier' : 'Couldn’t plan again right now.'}
                </AppText>
              ) : null}
            </View>
            <TextLink label="Not today" tone="secondary" onPress={() => dismissPlan(today, true)} />
            <PressScale
              accessibilityRole="button"
              accessibilityHint="Shortcut Shift A"
              onPress={() => acceptSuggestions(today, view.open.map((r) => r.s.taskId))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.accent }}
            >
              <AppText style={{ ...font(800), fontSize: 14, color: c.onAccent }}>{view.acceptedCount ? `Accept the rest (${view.open.length})` : 'Accept all'}</AppText>
              <Kbd k="⇧A" onAccent />
            </PressScale>
          </View>
          {view.rows.map((r, i) => (
            <SuggestionRow key={r.s.taskId} row={r} today={today} last={i === view.rows.length - 1} />
          ))}
        </DeskCard>
      );
      break;
  }

  return (
    <>
      <SectionHead coach right={again}>
        Today’s plan
      </SectionHead>
      {body}
    </>
  );
}

/** A6: kind icon, title, "10:00 – 11:00 · Work · reason", and a round accept check. */
function SuggestionRow({ row, today, last }: { row: PlanRowView; today: DateKey; last: boolean }) {
  const { c } = useTheme();
  const selected = useDeskState((s) => s.selected?.kind === 'suggestion' && s.selected.id === row.s.taskId);
  const [hover, setHover] = useState(false);
  const title = row.task?.title ?? 'Task';
  const dim = !!row.stale;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: dim }}
      accessibilityLabel={suggestionLabel(title, row.s, today, row.listName)}
      accessibilityHint="Opens it in the panel"
      onPress={() => useDeskState.setState({ selected: { kind: 'suggestion', id: row.s.taskId } })}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 64,
        paddingVertical: 8,
        paddingLeft: 20,
        paddingRight: 10,
        borderTopWidth: 1,
        borderTopColor: c.ground,
        backgroundColor: row.accepted || selected ? c.tint : hover ? c.desk.hover : 'transparent',
        opacity: dim ? 0.55 : 1,
        cursor: 'pointer',
        ...(last ? { borderBottomLeftRadius: 18, borderBottomRightRadius: 18 } : null),
      } as object}
    >
      <View aria-hidden style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: row.accepted ? c.card : c.ground, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={kindIcon[row.s.kind]} size={17} color={c.accentText} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText numberOfLines={1} style={{ ...font(700), fontSize: 15.5, textDecorationLine: row.stale === 'Already done' ? 'line-through' : 'none' }}>
          {title}
        </AppText>
        <AppText numberOfLines={1} style={{ fontSize: 13.5, marginTop: 2, color: c.textSecondary }}>
          <AppText style={{ ...font(700), fontSize: 13.5, color: row.edited ? c.accentText : c.text }}>{whenText(row.s, today)}</AppText>
          {row.edited ? ' (changed)' : ''}
          {[row.listName, row.s.reason].filter(Boolean).map((x) => ` · ${x}`).join('')}
        </AppText>
      </View>
      {row.stale ? (
        <AppText tone="secondary" style={{ ...font(700), fontSize: 13, paddingHorizontal: 8 }}>
          {row.stale}
        </AppText>
      ) : (
        <AcceptCheck accepted={row.accepted} label={`Accept: ${title}, ${whenText(row.s, today)}`} onPress={() => acceptSuggestions(today, [row.s.taskId])} />
      )}
    </Pressable>
  );
}

/** The round check on a suggestion: 28 px in a 44 px target. Filled once accepted. */
function AcceptCheck({ accepted, label, onPress }: { accepted: boolean; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    // A checkbox, like every other round check (and valid inside the row, which is itself a button).
    <PressScale
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: accepted, disabled: accepted }}
      disabled={accepted}
      onPress={onPress}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: accepted ? 0 : 2, borderColor: c.checkEmpty, backgroundColor: accepted ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {accepted ? <Icon name="check" size={16} strokeWidth={3} color={c.onAccent} /> : null}
      </View>
    </PressScale>
  );
}

// ─── Detail panel (docs/13 §8) ───

/** Nothing selected: the day's Google events, which the coach plans around and never moves. */
export function DebriefEmptyPanel() {
  const { c } = useTheme();
  const { today } = useToday();
  const cal = useCalendar();
  const coachOn = useSettings((s) => s.coachEnabled);
  const connected = cal.status === 'connected' || cal.status === 'failed';
  const events = connected ? eventsOn(cal.events, today, cal.hidden).filter((e) => !e.allDay) : [];
  return (
    <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 19 }}>
        Already on today
      </AppText>
      {events.length ? (
        <View style={{ gap: 8 }}>
          {events.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.desk.eventRow }}>
              <AppText tone="secondary" style={{ ...font(700), fontSize: 13.5, minWidth: 52 }}>
                {timeRange(eventStart(e), null)}
              </AppText>
              <View style={{ flex: 1 }}>
                <AppText style={{ ...font(700), fontSize: 14.5 }}>{e.title}</AppText>
                <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
                  {timeRange(eventStart(e), eventEnd(e))}
                </AppText>
              </View>
            </View>
          ))}
          <AppText tone="secondary" style={{ fontSize: 13.5, lineHeight: 20 }}>
            From Google Calendar. The coach plans around these and never moves them.
          </AppText>
        </View>
      ) : (
        <AppText tone="secondary" style={{ fontSize: 14, lineHeight: 21 }}>
          {connected ? 'Nothing on your calendar today.' : 'Google Calendar isn’t connected, so there are no events to plan around.'}
        </AppText>
      )}
      <View style={{ height: 1, backgroundColor: c.ground, marginVertical: 4 }} />
      <AppText tone="secondary" style={{ fontSize: 14 }}>
        Click a task to see it here.
      </AppText>
      {coachOn ? (
        <AppText tone="secondary" style={{ fontSize: 13.5, lineHeight: 20 }}>
          Task notes stay on your devices. The coach doesn’t see them.
        </AppText>
      ) : null}
    </ScrollView>
  );
}

/** A selected suggestion: the coach box on top, then the task as usual. */
export function SuggestionPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const today = toKey(new Date());
  const view = useDayPlan(today);
  const row = view.state === 'ready' ? view.rows.find((r) => r.s.taskId === id) : undefined;
  if (!row) return <TaskPanel id={id} onClose={onClose} />;
  const open = !row.accepted && !row.stale;
  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View style={{ backgroundColor: c.tint, borderRadius: 18, padding: 16, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View accessibilityLabel="Coach" accessibilityRole="image">
            <Icon name="coach" size={16} strokeWidth={2.2} color={c.accentText} />
          </View>
          <AppText style={{ ...font(700), fontSize: 13, color: c.accentText }}>{row.accepted ? 'Accepted' : row.stale ?? 'Suggested'}</AppText>
        </View>
        <AppText style={{ ...font(800), fontSize: 18 }}>{whenText(row.s, today)}</AppText>
        {row.s.reason ? <AppText style={{ fontSize: 14, lineHeight: 20 }}>{row.s.reason}</AppText> : null}
        {open ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            <PressScale
              accessibilityRole="button"
              accessibilityHint="Shortcut A"
              onPress={() => acceptSuggestions(today, [id])}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.accent }}
            >
              <AppText style={{ ...font(800), fontSize: 13.5, color: c.onAccent }}>Accept</AppText>
              <Kbd k="A" onAccent />
            </PressScale>
            {row.s.kind !== 'today' ? (
              <PressScale
                accessibilityRole="button"
                onPress={() => sheets.open(() => (row.s.kind === 'schedule' ? <ChangeTime taskId={id} s={row.s} /> : <ChangeDay taskId={id} s={row.s} />), 'dialog')}
                style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.card, justifyContent: 'center' }}
              >
                <AppText style={{ ...font(700), fontSize: 13.5 }}>{row.s.kind === 'schedule' ? 'Change time…' : 'Change day…'}</AppText>
              </PressScale>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <TaskPanel id={id} onClose={onClose} />
      </View>
    </View>
  );
}

/** A selected leftover: Today / Tomorrow / Pick day… on top, then the task. */
export function LeftoverPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { c } = useTheme();
  const actions = useTaskActions();
  const task = useStore((s) => s.tasks.find((t) => t.id === id));
  const today = toKey(new Date());
  if (!task) return <TaskPanel id={id} onClose={onClose} />;
  const isLeft = !task.doneAt && !!task.dueDate && task.dueDate < today;
  const chip = (label: string, onPress: () => void, tone?: 'warn') => (
    <PressScale
      key={label}
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: tone === 'warn' ? c.warnTint : c.card }}
    >
      <AppText style={{ ...font(700), fontSize: 13.5, color: tone === 'warn' ? c.warnText : c.text }}>{label}</AppText>
    </PressScale>
  );
  return (
    <View style={{ flex: 1, gap: 16 }}>
      {isLeft ? (
        <View style={{ backgroundColor: c.tint, borderRadius: 18, padding: 16, gap: 10 }}>
          <AppText style={{ ...font(700), fontSize: 13, color: c.accentText }}>{`Left over · from ${weekdayShort(task.dueDate!)}`}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {chip('Today', () => decideLeftover(id, 'today', 'Moved to today'))}
            {chip('Tomorrow', () => decideLeftover(id, 'tomorrow', 'Moved to tomorrow'))}
            {chip('Pick day…', () => {
              useStore.getState().answerDebrief(today, 'reschedule');
              actions.pickDate(id);
            })}
            {task.carriedOverCount >= 2
              ? chip(
                  'Back to Inbox',
                  () => {
                    const undo = useStore.getState().taskBackToInbox(id);
                    useStore.getState().answerDebrief(today, 'reschedule');
                    pushSnack({ title: 'Back in Inbox', actions: [{ label: 'Undo', onPress: undo }] });
                  },
                  'warn',
                )
              : null}
          </View>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <TaskPanel id={id} onClose={onClose} />
      </View>
    </View>
  );
}

const webInput = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;
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

/** MacChangeTime: start and end, a "fits" hint, Use this time. The suggestion still needs Accept. */
function ChangeTime({ taskId, s }: { taskId: string; s: Suggestion }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const today = toKey(new Date());
  const planStart = useSettings((st) => st.planStart);
  const planEnd = useSettings((st) => st.planEnd);
  const win = { start: planStart, end: planEnd };
  const cal = useCalendar();
  const tasks = useStore((st) => st.tasks);
  const [from, setFrom] = useState(formatTime(s.start ?? '09:00'));
  const [to, setTo] = useState(formatTime(s.end ?? '10:00'));
  const a = parseTime(from);
  const b = parseTime(to);
  const connected = cal.status === 'connected' || cal.status === 'failed';
  const busy = [
    ...(connected ? eventsOn(cal.events, today, cal.hidden).filter((e) => !e.allDay) : []).map((e) => ({ start: eventStart(e)!, end: eventEnd(e)!, title: e.title })),
    ...tasks
      .filter((t) => t.id !== taskId && !t.doneAt && !t.deletedAt && t.dueDate === today && t.startTime)
      .map((t) => ({ start: t.startTime!, end: t.endTime ?? minutesPlus(t.startTime!, 30), title: t.title })),
  ];
  const problem = !a || !b ? 'Type times like 10:00 or 2pm.' : clashOf(a, b, busy, win);
  const save = () => {
    if (!a || !b || (a && b && timeToMinutes(b) <= timeToMinutes(a))) return;
    editSuggestion(today, taskId, { start: a, end: b });
    close();
  };
  const field = (label: string, value: string, onChange: (t: string) => void, autoFocus?: boolean) => (
    <View style={{ flex: 1, gap: 6 }}>
      <AppText tone="secondary" style={{ ...font(600), fontSize: 12.5 }}>
        {label}
      </AppText>
      <View style={{ minHeight: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2, borderColor: c.line, justifyContent: 'center' }}>
        <TextInput autoFocus={autoFocus} value={value} onChangeText={onChange} onSubmitEditing={save} accessibilityLabel={label} style={[{ ...font(800), fontSize: 18, color: c.text }, webInput]} />
      </View>
    </View>
  );
  return (
    <View accessibilityRole="alert" style={{ width: 420, maxWidth: '100%', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border, padding: 26, gap: 16 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>
        Change time
      </AppText>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {field('Starts', from, setFrom, true)}
        {field('Ends', to, setTo)}
      </View>
      <AppText accessibilityLiveRegion="polite" style={{ ...font(600), fontSize: 13.5, color: problem ? c.warnText : c.accentText }}>
        {problem ?? 'Fits between your events.'}
      </AppText>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={close} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.ground }}>
          <AppText style={{ ...font(800), fontSize: 14.5 }}>Cancel</AppText>
          <Kbd k="Esc" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!a || !b || timeToMinutes(b) <= timeToMinutes(a)}
          onPress={save}
          style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.accent, justifyContent: 'center', opacity: !a || !b || timeToMinutes(b) <= timeToMinutes(a) ? 0.5 : 1 }}
        >
          <AppText style={{ ...font(800), fontSize: 14.5, color: c.onAccent }}>Use this time</AppText>
        </Pressable>
      </View>
    </View>
  );
}
const minutesPlus = (t: TimeKey, m: number) => {
  const x = Math.min(23 * 60 + 59, timeToMinutes(t) + m);
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

/** Change day… for a "later" suggestion: the next six days. */
function ChangeDay({ taskId, s }: { taskId: string; s: Suggestion }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const today = toKey(new Date());
  const days = Array.from({ length: 6 }, (_, i) => addDays(today, i + 1));
  return (
    <View accessibilityRole="alert" style={{ width: 420, maxWidth: '100%', backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.desk.border, padding: 26, gap: 16 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 21 }}>
        Change day
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {days.map((d) => {
          const on = d === s.date;
          const w = dayWord(d, today);
          return (
            <PressScale
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => {
                editSuggestion(today, taskId, { date: d });
                close();
              }}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.accent : c.ground }}
            >
              <AppText style={{ ...font(700), fontSize: 13.5, color: on ? c.onAccent : c.text }}>{w === 'tomorrow' ? 'Tomorrow' : `${w} ${monthDay(d).split(' ')[1]}`}</AppText>
            </PressScale>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" onPress={close} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: c.ground }}>
          <AppText style={{ ...font(800), fontSize: 14.5 }}>Cancel</AppText>
          <Kbd k="Esc" />
        </Pressable>
      </View>
    </View>
  );
}

// Re-exported for the Today card.
export { planRow };
