import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { useCloseSheet, useSheets } from '@/components/Sheet';
import { Spinner } from '@/components/Spinner';
import { COACH_FAILURE_COPY } from '@/features/coach/api';
import {
  back,
  discardSetup,
  keepTalking,
  makePlan,
  pick,
  resumeSetup,
  retry,
  saveProblem,
  saveSetup,
  setDates,
  setDump,
  setProposal,
  startSetup,
  submitDump,
  useSetupRun,
} from '@/features/coach/useSeasonSetup';
import { SeasonDatesSheet } from '@/features/sheets/SeasonDatesSheet';
import { monthDay } from '@/lib/dates';
import { answeredCount, countLine, goalRows, MAX_QUESTIONS, MIN_DUMP, openingQuestion, progressOf, supportRows, type ProposalDraft, type ProposalRow, type ProposalTask } from '@/lib/seasonSetup';
import { dateRange, TIER_HINT, TIER_LABEL, TIERS, totalWeeks } from '@/lib/seasons';
import { useLocal } from '@/store/local';
import type { Tier } from '@/store/types';
import { useTheme } from '@/theme/ThemeProvider';
import { listColors } from '@/theme/tokens';
import { font } from '@/theme/typography';
import { typingInField } from '../dom';
import { DeskConfirm } from '../Dialog';
import { Kbd } from '../Kbd';
import { MenuCard, MenuItem } from '../Menu';
import { modKey } from '../platform';
import { DeskPage } from '../ui';
import { useViewKeys } from '../useDeskKeys';

// WCSeasonSetup and WCSeasonProposal, Superfocus-style (owner, 11 Nov 2026): the opening question,
// then up to 6 questions one at a time with answers to pick from, then the proposal to edit and save.

const webInput = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** ⌘↩ / ⌘S work even while typing; the browser's own Save never opens (docs/13 §8). */
function useModKeys(onEnter: (() => void) | null, onSave: (() => void) | null) {
  const ref = useRef({ onEnter, onSave });
  useEffect(() => {
    ref.current = { onEnter, onSave };
  });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const fn = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key === 'Enter' && ref.current.onEnter) {
        e.preventDefault();
        e.stopPropagation();
        ref.current.onEnter();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        ref.current.onSave?.();
      }
    };
    window.addEventListener('keydown', fn, true);
    return () => window.removeEventListener('keydown', fn, true);
  }, []);
}

export function SeasonSetupDesk() {
  const draft = useLocal((l) => l.seasonSetup ?? null);
  const run = useSetupRun();
  // Arriving here starts a setup, or picks up the one in progress.
  const [resumed] = useState(() => !!useLocal.getState().seasonSetup);
  useEffect(() => {
    startSetup();
    resumeSetup();
  }, []);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/season'));

  const steps = draft?.steps ?? [];
  const last = steps[steps.length - 1];
  const onDump = !!draft && !draft.proposal && !steps.length && run.status !== 'asking';
  const onProposal = !!draft?.proposal;

  useViewKeys((k) => {
    if (k === 'Escape') return close(), true;
    if (!draft || onDump || onProposal || typingInField() || run.status !== 'idle') return false;
    const n = Number(k);
    if (last && last.answer === null && n >= 1 && n <= last.options.length) return pick(last.options[n - 1]), true;
    return false;
  });
  useModKeys(
    onDump ? () => (draft && draft.dump.trim().length >= MIN_DUMP ? submitDump() : undefined) : !onProposal && answeredCount(steps) > 0 ? () => void makePlan() : null,
    onProposal ? saveSetup : null,
  );

  if (!draft) return <DeskPage>{null}</DeskPage>;
  return (
    <DeskPage>
      <TopBar onClose={close} />
      <View style={{ alignSelf: 'center', width: '100%', maxWidth: onProposal ? 820 : 720, marginTop: 28 }}>
        {onProposal ? (
          <ProposalView />
        ) : onDump ? (
          <DumpView resumed={resumed && draft.dump.length > 0} />
        ) : (
          <QuestionView key={steps.length} resumed={resumed} />
        )}
      </View>
    </DeskPage>
  );
}

function TopBar({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const sheets = useSheets();
  const draft = useLocal((l) => l.seasonSetup)!;
  const discard = () =>
    sheets.open(
      () => (
        <DeskConfirm
          title="Discard this conversation?"
          body="Nothing has been saved yet."
          confirmLabel="Discard"
          onConfirm={() => {
            discardSetup();
            router.replace('/season');
          }}
        />
      ),
      'dialog',
    );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 260 }}>
        <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 20 }}>
          New season
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <AppText tone="secondary" style={{ fontSize: 14 }}>{`${totalWeeks(draft)} weeks · ${dateRange(draft)}`}</AppText>
          <PressScale
            accessibilityRole="button"
            accessibilityHint="Changes the season's dates"
            onPress={() => sheets.open(() => <SeasonDatesSheet value={draft} onSave={setDates} />, 'dialog')}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <AppText style={{ ...font(700), fontSize: 14, color: c.accentText }}>Change dates…</AppText>
          </PressScale>
        </View>
      </View>
      <PressScale accessibilityRole="button" onPress={() => router.push('/season/manual')} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}>
        <AppText style={{ ...font(700), fontSize: 14, color: c.textSecondary }}>Set it up myself</AppText>
      </PressScale>
      <PressScale accessibilityRole="button" onPress={discard} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}>
        <AppText style={{ ...font(700), fontSize: 14, color: c.dangerText }}>Discard…</AppText>
      </PressScale>
      <PressScale
        accessibilityRole="button"
        accessibilityHint="Your answers are kept on this computer"
        onPress={onClose}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 14, borderRadius: 13, backgroundColor: c.card }}
      >
        <AppText style={{ ...font(700), fontSize: 14 }}>Close</AppText>
        <Kbd k="Esc" />
      </PressScale>
    </View>
  );
}

function PrimaryButton({ label, k, disabled, onPress }: { label: string; k?: string; disabled?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 22, borderRadius: 15, backgroundColor: disabled ? c.line : c.accent }}
    >
      <AppText style={{ ...font(800), fontSize: 15, color: disabled ? c.textSecondary : c.onAccent }}>{label}</AppText>
      {k && !disabled ? <Kbd k={k} onAccent /> : null}
    </PressScale>
  );
}

function Bar({ value, label }: { value: number; label: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ height: 6, borderRadius: 3, backgroundColor: c.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
    </View>
  );
}

function CoachTile() {
  const { c } = useTheme();
  return (
    <View accessibilityRole="image" accessibilityLabel="Coach" style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="coach" size={26} strokeWidth={2.2} color={c.accentText} />
    </View>
  );
}

// ─── 1. The opening question ───

function DumpView({ resumed }: { resumed: boolean }) {
  const { c } = useTheme();
  const draft = useLocal((l) => l.seasonSetup)!;
  const run = useSetupRun();
  const n = draft.dump.trim().length;
  const ready = n >= MIN_DUMP;
  return (
    <View style={{ alignItems: 'center', gap: 14, backgroundColor: c.card, borderRadius: 24, paddingVertical: 40, paddingHorizontal: 36 }}>
      {resumed ? (
        <AppText tone="secondary" style={{ ...font(600), fontSize: 13 }}>
          Picking up where you left off
        </AppText>
      ) : null}
      <CoachTile />
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 26, lineHeight: 33, textAlign: 'center', letterSpacing: -0.4, maxWidth: 600 }}>
        {openingQuestion(draft.endDate)}
      </AppText>
      <AppText tone="secondary" style={{ fontSize: 15, textAlign: 'center' }}>
        The more you share, the sharper the plan.
      </AppText>
      <View style={{ alignSelf: 'stretch', marginTop: 10, gap: 10 }}>
        <View style={{ minHeight: 150, borderRadius: 18, borderWidth: 2, borderColor: c.line, paddingVertical: 12, paddingHorizontal: 16 }}>
          <TextInput
            autoFocus
            multiline
            value={draft.dump}
            onChangeText={setDump}
            maxLength={2000}
            placeholder="Projects, habits, how you want to feel by then."
            placeholderTextColor={c.textSecondary}
            accessibilityLabel="Your answer"
            style={[{ flex: 1, minHeight: 124, fontSize: 16, lineHeight: 24, color: c.text, textAlignVertical: 'top' }, webInput]}
          />
        </View>
        <Bar value={Math.min(1, n / MIN_DUMP)} label="Length of your answer" />
        <AppText accessibilityLiveRegion="polite" style={{ ...font(700), fontSize: 13.5, alignSelf: 'flex-end', color: ready ? c.accentText : c.textSecondary }}>
          {ready ? 'Enough to start. More is welcome.' : `${n} / ${MIN_DUMP} minimum`}
        </AppText>
      </View>
      {run.status === 'failed' && run.reason ? <Failure reason={run.reason} /> : null}
      <View style={{ marginTop: 6 }}>
        <PrimaryButton label="Continue" k={`${modKey} ↩`} disabled={!ready} onPress={submitDump} />
      </View>
      <AppText tone="secondary" style={{ fontSize: 13, textAlign: 'center', maxWidth: 520, lineHeight: 19 }}>
        The coach sees what you write here and your list names. It stays on this computer until you save or discard.
      </AppText>
    </View>
  );
}

// ─── 2. One question at a time ───

function QuestionView({ resumed }: { resumed: boolean }) {
  const { c } = useTheme();
  const draft = useLocal((l) => l.seasonSetup)!;
  const run = useSetupRun();
  const steps = draft.steps;
  const last = steps[steps.length - 1];
  const answered = answeredCount(steps);
  const waiting = run.status === 'asking' || run.status === 'proposing';
  // Waiting for the first question, or showing the last one while the next is on its way.
  const shown = last;
  const number = shown ? steps.length : 1;
  const picked = shown?.answer ?? shown?.previous ?? null;
  const [own, setOwn] = useState(picked && !shown?.options.includes(picked) ? picked : '');
  const locked = waiting || (shown?.answer ?? null) !== null;

  return (
    <View style={{ backgroundColor: c.card, borderRadius: 24, paddingVertical: 30, paddingHorizontal: 36, gap: 18 }}>
      <View style={{ gap: 10 }}>
        <PressScale accessibilityRole="button" accessibilityLabel="Back" onPress={back} disabled={waiting} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 36, opacity: waiting ? 0.5 : 1 }}>
          <Icon name="back" size={18} color={c.textSecondary} />
          <AppText tone="secondary" style={{ ...font(700), fontSize: 14 }}>
            Back
          </AppText>
        </PressScale>
        <Bar value={progressOf(steps)} label="Questions answered" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText tone="secondary" style={{ ...font(600), fontSize: 13.5 }}>{`Question ${number} of ${MAX_QUESTIONS} at most`}</AppText>
          {resumed && answered ? (
            <AppText tone="secondary" style={{ fontSize: 13.5 }}>
              Picking up where you left off
            </AppText>
          ) : null}
        </View>
      </View>

      {shown ? (
        <>
          <AppText accessibilityRole="header" accessibilityLiveRegion="polite" style={{ ...font(800), fontSize: 23, lineHeight: 31, letterSpacing: -0.3 }}>
            {shown.question}
          </AppText>
          <View accessibilityRole="radiogroup" accessibilityLabel="Answers" style={{ gap: 10 }}>
            {shown.options.map((o, i) => (
              <OptionRow key={o} label={o} n={i + 1} on={picked === o} disabled={locked} onPress={() => pick(o)} />
            ))}
            <OwnAnswer value={own} onChange={setOwn} on={!!picked && picked === own.trim()} disabled={locked} onSend={() => pick(own)} />
          </View>
        </>
      ) : null}

      {run.status === 'failed' && run.reason ? (
        <Failure reason={run.reason} />
      ) : waiting ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
          <Spinner size={16} />
          <AppText tone="secondary" style={{ fontSize: 15 }}>
            {run.status === 'proposing' ? 'Putting it together…' : 'Thinking…'}
          </AppText>
        </View>
      ) : null}

      {answered > 0 && !waiting ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: c.ground, paddingTop: 14 }}>
          <AppText tone="secondary" style={{ flex: 1, fontSize: 13.5 }}>
            Seen enough? The coach can plan from what you’ve said so far.
          </AppText>
          <PressScale accessibilityRole="button" onPress={() => void makePlan()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 }}>
            <AppText style={{ ...font(800), fontSize: 14, color: c.accentText }}>Make the plan</AppText>
            <Kbd k={`${modKey} ↩`} />
          </PressScale>
        </View>
      ) : null}
    </View>
  );
}

function Radio({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View aria-hidden style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 0 : 2, borderColor: c.checkEmpty, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.onAccent }} /> : null}
    </View>
  );
}

function OptionRow({ label, n, on, disabled, onPress }: { label: string; n: number; on: boolean; disabled: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on, disabled }}
      accessibilityHint={`Shortcut ${n}`}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 58,
        paddingVertical: 10,
        paddingLeft: 18,
        paddingRight: 14,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: on ? c.accent : hover && !disabled ? c.tint : c.ground,
        backgroundColor: on ? c.tint : c.card,
        cursor: disabled ? 'default' : 'pointer',
      } as object}
    >
      <Radio on={on} />
      <AppText style={{ flex: 1, fontSize: 15.5, lineHeight: 22 }}>{label}</AppText>
      {disabled ? null : <Kbd k={String(n)} />}
    </Pressable>
  );
}

function OwnAnswer({ value, onChange, on, disabled, onSend }: { value: string; onChange: (v: string) => void; on: boolean; disabled: boolean; onSend: () => void }) {
  const { c } = useTheme();
  const can = !!value.trim() && !disabled;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, paddingVertical: 6, paddingLeft: 18, paddingRight: 8, borderRadius: 16, borderWidth: 2, borderColor: on ? c.accent : c.ground, backgroundColor: on ? c.tint : c.card }}>
      <Radio on={on} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={() => can && onSend()}
        editable={!disabled}
        maxLength={400}
        placeholder="Something else…"
        placeholderTextColor={c.textSecondary}
        accessibilityLabel="Your own answer"
        style={[{ flex: 1, minHeight: 44, fontSize: 15.5, color: c.text }, webInput]}
      />
      <PressScale
        accessibilityRole="button"
        accessibilityLabel="Send your answer"
        accessibilityState={{ disabled: !can }}
        disabled={!can}
        onPress={onSend}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: can ? c.accent : c.ground, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="arrowRight" size={20} color={can ? c.onAccent : c.textSecondary} />
      </PressScale>
    </View>
  );
}

/** A14-style failure line with what to do next. */
function Failure({ reason }: { reason: string }) {
  const { c } = useTheme();
  const copy =
    reason === 'offline'
      ? 'You’re offline. The coach needs a connection.'
      : reason === 'limit'
        ? 'The coach has done enough for today. Your answers are kept; carry on tomorrow.'
        : reason === 'off'
          ? 'The coach is off. Turn it on in Settings, or set the season up yourself.'
          : reason === 'signed_out'
            ? COACH_FAILURE_COPY.signed_out
            : 'That didn’t go through.';
  const again = reason !== 'limit' && reason !== 'off' && reason !== 'signed_out';
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.ground }}>
      <AppText tone="secondary" style={{ flex: 1, fontSize: 14.5, minWidth: 200 }}>
        {copy}
      </AppText>
      {again ? (
        <PressScale accessibilityRole="button" onPress={retry} style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
          <AppText style={{ ...font(700), fontSize: 14, color: c.accentText }}>Try again</AppText>
        </PressScale>
      ) : null}
    </View>
  );
}

// ─── 3. The proposal ───

function ProposalView() {
  const { c } = useTheme();
  const sheets = useSheets();
  const draft = useLocal((l) => l.seasonSetup)!;
  const run = useSetupRun();
  const p = draft.proposal!;
  const goals = goalRows(p);
  const support = supportRows(p);
  const problem = saveProblem(draft);
  const line = countLine(p);
  const update = (fn: (p: ProposalDraft) => ProposalDraft) => {
    const cur = useLocal.getState().seasonSetup?.proposal;
    if (cur) setProposal(fn(cur));
  };
  const row = (ref: string, patch: Partial<ProposalRow>) => update((x) => ({ ...x, rows: x.rows.map((r) => (r.ref === ref ? { ...r, ...patch } : r)) }));
  const task = (id: string, patch: Partial<ProposalTask>) => update((x) => ({ ...x, tasks: x.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  // Removing a goal: a new list isn't created; an existing list goes back to Support without a goal line.
  const remove = (r: ProposalRow) => (r.isNew ? row(r.ref, { keep: false }) : row(r.ref, { tier: 'support', goal: '' }));
  const addGoal = (x: number, y: number) =>
    sheets.open(
      () => (
        <AddGoalMenu
          support={support}
          onPick={(ref) => row(ref, { tier: 'secondary' })}
          onNew={() => update((q) => ({ ...q, rows: [...q.rows, { ref: `new${q.rows.length + 1}x`, isNew: true, name: '', color: 'purple', tier: 'secondary', goal: '', keep: true }] }))}
        />
      ),
      'menu',
      { x, y },
    );

  return (
    <View style={{ gap: 6 }}>
      <View style={{ alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <CoachTile />
        <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 28, letterSpacing: -0.5 }}>
          Your season
        </AppText>
        {p.intro ? (
          <AppText style={{ fontSize: 15.5, lineHeight: 23, textAlign: 'center', maxWidth: 600 }}>{p.intro}</AppText>
        ) : null}
        <AppText tone="secondary" style={{ fontSize: 14, textAlign: 'center' }}>
          Edits here change the proposal only. Nothing is created until you save.
        </AppText>
      </View>

      <SectionTitle title="Season goals" sub="What each list is working toward by the end of the season." />
      <View style={{ gap: 10 }}>
        {goals.map((r) => (
          <GoalCard key={r.ref} r={r} tasks={p.tasks.filter((t) => t.listRef === r.ref)} onRow={(patch) => row(r.ref, patch)} onTask={task} onRemove={() => remove(r)} />
        ))}
        <PressScale
          accessibilityRole="button"
          onPress={(e) => {
            const n = e.nativeEvent as unknown as { pageX: number; pageY: number };
            addGoal(n.pageX - 130, n.pageY + 12);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 16, backgroundColor: c.card }}
        >
          <Icon name="plus" size={18} color={c.accentText} />
          <AppText style={{ ...font(700), fontSize: 14.5, color: c.accentText }}>Add goal</AppText>
        </PressScale>
      </View>

      <SectionTitle title="Support" sub="Upkeep that still needs doing, but isn’t a focus this season." />
      <View style={{ backgroundColor: c.card, borderRadius: 18, overflow: 'hidden' }}>
        {support.length ? (
          support.map((r, i) => (
            <View key={r.ref} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingLeft: 18, paddingRight: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.ground }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: listColors[r.color] }} />
              {r.isNew ? (
                <TextInput value={r.name} onChangeText={(name) => row(r.ref, { name })} maxLength={40} accessibilityLabel="New list name" style={[{ flex: 1, minHeight: 44, ...font(700), fontSize: 15, color: c.text }, webInput]} />
              ) : (
                <AppText style={{ flex: 1, ...font(700), fontSize: 15 }}>{r.name}</AppText>
              )}
              {r.isNew ? <Chip text="New" /> : null}
              <PressScale accessibilityRole="button" accessibilityLabel={`Make ${r.name || 'this list'} a goal`} onPress={() => row(r.ref, { tier: 'secondary' })} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}>
                <AppText style={{ ...font(700), fontSize: 13.5, color: c.accentText }}>Make a goal</AppText>
              </PressScale>
              {r.isNew ? <RemoveButton label={`Remove ${r.name || 'new list'}`} onPress={() => row(r.ref, { keep: false })} /> : null}
            </View>
          ))
        ) : (
          <AppText tone="secondary" style={{ fontSize: 14, padding: 18 }}>
            Every list is a goal this season.
          </AppText>
        )}
      </View>

      <SectionTitle title="Season brief" sub="Saved with the season. The daily plan reads it. You can change it any time." />
      <View style={{ backgroundColor: c.card, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 18 }}>
        <TextInput
          multiline
          value={p.brief}
          onChangeText={(brief) => update((x) => ({ ...x, brief }))}
          maxLength={600}
          placeholder="What comes first, hours a week, what you’re saying no to."
          placeholderTextColor={c.textSecondary}
          accessibilityLabel="Season brief"
          style={[{ minHeight: 96, fontSize: 15, lineHeight: 22, color: c.text, textAlignVertical: 'top' }, webInput]}
        />
      </View>

      {problem ? (
        <AppText accessibilityLiveRegion="polite" style={{ ...font(600), fontSize: 14, color: c.dangerText, marginTop: 12, textAlign: 'center' }}>
          {`${problem} Change the dates at the top.`}
        </AppText>
      ) : null}
      <View style={{ alignItems: 'center', gap: 8, marginTop: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {answeredCount(draft.steps) < MAX_QUESTIONS ? (
            <PressScale accessibilityRole="button" onPress={keepTalking} disabled={run.status !== 'idle'} style={{ minHeight: 48, paddingHorizontal: 18, borderRadius: 15, backgroundColor: c.card, justifyContent: 'center' }}>
              <AppText style={{ ...font(700), fontSize: 15 }}>Keep talking</AppText>
            </PressScale>
          ) : null}
          <PrimaryButton label="Save season" k={`${modKey} S`} disabled={!!problem} onPress={saveSetup} />
        </View>
        <AppText tone="secondary" style={{ fontSize: 13.5 }}>
          {line ? `${line} · one Undo` : 'Tiers and goal lines only · one Undo'}
        </AppText>
      </View>
    </View>
  );
}

function AddGoalMenu({ support, onPick, onNew }: { support: ProposalRow[]; onPick: (ref: string) => void; onNew: () => void }) {
  const close = useCloseSheet();
  return (
    <MenuCard label="Add a goal" width={260}>
      <AppText tone="secondary" style={{ ...font(700), fontSize: 12.5, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 }}>
        Add a goal to
      </AppText>
      {support.map((r) => (
        <MenuItem
          key={r.ref}
          label={r.name || 'New list'}
          onPress={() => {
            close();
            onPick(r.ref);
          }}
        />
      ))}
      <MenuItem
        label="A new list"
        icon="plus"
        onPress={() => {
          close();
          onNew();
        }}
      />
    </MenuCard>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ paddingTop: 22, paddingBottom: 10, gap: 2 }}>
      <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 17 }}>
        {title}
      </AppText>
      <AppText tone="secondary" style={{ fontSize: 14 }}>
        {sub}
      </AppText>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ minHeight: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: 'center', backgroundColor: c.tint }}>
      <AppText style={{ ...font(700), fontSize: 12.5, color: c.accentText }}>{text}</AppText>
    </View>
  );
}

function RemoveButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" size={18} color={c.textSecondary} />
    </PressScale>
  );
}

/** One goal: its outcome line, the list it lives on, Core / Secondary, and (for core) the first tasks. */
function GoalCard({ r, tasks, onRow, onTask, onRemove }: { r: ProposalRow; tasks: ProposalTask[]; onRow: (p: Partial<ProposalRow>) => void; onTask: (id: string, p: Partial<ProposalTask>) => void; onRemove: () => void }) {
  const { c } = useTheme();
  const tiers: Tier[] = TIERS.filter((t) => t !== 'support');
  return (
    <View style={{ backgroundColor: c.card, borderRadius: 18, paddingVertical: 14, paddingLeft: 18, paddingRight: 8, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 12, height: 12, borderRadius: 4, marginTop: 15, backgroundColor: listColors[r.color] }} />
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput
            value={r.goal}
            onChangeText={(goal) => onRow({ goal })}
            maxLength={80}
            placeholder="What this list is working toward"
            placeholderTextColor={c.textSecondary}
            accessibilityLabel={`Goal for ${r.name || 'the new list'}`}
            style={[{ minHeight: 40, ...font(700), fontSize: 16.5, color: c.text }, webInput]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {r.isNew ? (
              <>
                <Chip text="New list" />
                <TextInput
                  value={r.name}
                  onChangeText={(name) => onRow({ name })}
                  maxLength={40}
                  placeholder="List name"
                  placeholderTextColor={c.textSecondary}
                  accessibilityLabel="New list name"
                  style={[{ minWidth: 160, minHeight: 32, ...font(600), fontSize: 14, color: c.textSecondary }, webInput]}
                />
              </>
            ) : (
              <AppText tone="secondary" style={{ ...font(600), fontSize: 14 }}>{`List · ${r.name}`}</AppText>
            )}
          </View>
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel={`Tier of ${r.name || 'the new list'}`} style={{ flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: c.cal.segBg, marginTop: 2 }}>
          {tiers.map((t) => {
            const on = r.tier === t;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityHint={TIER_HINT[t]}
                onPress={() => onRow({ tier: t })}
                style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 9, backgroundColor: on ? c.card : 'transparent', justifyContent: 'center' }}
              >
                <AppText style={{ ...font(on ? 700 : 600), fontSize: 13.5, color: on ? c.text : c.textSecondary }}>{TIER_LABEL[t]}</AppText>
              </Pressable>
            );
          })}
        </View>
        <RemoveButton label={`Remove the goal for ${r.name || 'the new list'}`} onPress={onRemove} />
      </View>
      {tasks.length ? (
        <View style={{ marginLeft: 24, marginRight: 10, borderRadius: 14, backgroundColor: c.ground, paddingVertical: 4 }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 12.5, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 }}>
            First tasks · suggested
          </AppText>
          {tasks.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 4, paddingRight: 14 }}>
              <PressScale
                accessibilityRole="checkbox"
                accessibilityState={{ checked: t.keep }}
                accessibilityLabel={`Keep: ${t.title}`}
                onPress={() => onTask(t.id, { keep: !t.keep })}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: t.keep ? 0 : 2, borderColor: c.checkEmpty, backgroundColor: t.keep ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {t.keep ? <Icon name="check" size={14} strokeWidth={3} color={c.onAccent} /> : null}
                </View>
              </PressScale>
              <TextInput
                value={t.title}
                onChangeText={(title) => onTask(t.id, { title })}
                maxLength={120}
                accessibilityLabel="First task"
                style={[{ flex: 1, minHeight: 40, fontSize: 15, color: t.keep ? c.text : c.textSecondary, textDecorationLine: t.keep ? 'none' : 'line-through' }, webInput]}
              />
              {t.date ? (
                <AppText tone="secondary" style={{ fontSize: 13 }}>
                  {monthDay(t.date)}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

