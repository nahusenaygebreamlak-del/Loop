import { useMemo, useState, type ReactNode } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { KeyboardLift } from '@/components/KeyboardLift';
import { PressScale } from '@/components/PressScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { goMain } from '@/features/nav';
import { longDate, relativeDay, timeRange, todayKey } from '@/lib/dates';
import { parseQuickAdd } from '@/lib/parse';
import { useLocal } from '@/store/local';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/** The interactive tutorial on real data: NTut1 add a task, NTut2 tick it off, NTut3 dump a note → Today with NTutDone. */
export default function Tutorial() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const today = todayKey();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [text, setText] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  const finish = () => {
    useLocal.setState({ onboarded: true, tutDoneCard: true });
    goMain('/');
  };

  const saveTask = () => {
    if (!parsed.title) return;
    const id = useStore.getState().addTask({ title: parsed.title, dueDate: parsed.date ?? today, startTime: parsed.startTime, endTime: parsed.endTime, priority: parsed.priority ?? 0 });
    setTaskId(id);
    setStep(2);
  };
  const saveNote = () => {
    const t = note.trim();
    if (t) useStore.getState().addInboxItem(t);
    finish();
  };

  const chip = parsed.date || parsed.startTime ? `${relativeDay(parsed.date ?? today, today)}${parsed.startTime ? `, ${timeRange(parsed.startTime, parsed.endTime)}` : ''}` : null;
  const input = (value: string, onChange: (t: string) => void, onSubmit: () => void, placeholder: string, label: string, big?: boolean) => (
    <TextInput
      autoFocus
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      submitBehavior="blurAndSubmit"
      returnKeyType="done"
      placeholder={placeholder}
      placeholderTextColor={c.textSecondary}
      accessibilityLabel={label}
      style={[{ flex: 1, minWidth: 0, color: c.text, ...(big ? { ...font(700), fontSize: 20, lineHeight: 29 } : { ...font(600), fontSize: 16 }) }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
    />
  );

  return (
    <KeyboardLift style={{ backgroundColor: c.ground, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 22, paddingHorizontal: size.sideMargin }}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={{ width: n === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: n <= step ? c.accent : c.line }} />
        ))}
        <AppText accessibilityLiveRegion="polite" tone="secondary" style={{ ...font(700), fontSize: 13, marginLeft: 8, flex: 1 }}>{`${step} of 3`}</AppText>
        <PressScale accessibilityRole="button" accessibilityLabel="Skip the tutorial" onPress={finish} style={{ minHeight: 44, justifyContent: 'center' }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 14 }}>
            Skip
          </AppText>
        </PressScale>
      </View>

      <View style={{ paddingTop: 8, paddingHorizontal: size.sideMargin }}>
        <AppText tone="secondary" style={{ fontSize: 15 }}>
          {step === 3 ? 'For things without a date yet' : longDate(today)}
        </AppText>
        <AppText variant="display" accessibilityRole="header" style={{ marginTop: 4 }}>
          {step === 3 ? 'Inbox' : 'Today'}
        </AppText>
      </View>

      {step === 1 ? (
        <>
          <View style={{ marginTop: 28, marginHorizontal: size.sideMargin, borderRadius: 22, backgroundColor: c.card, paddingVertical: 28, paddingHorizontal: 24, gap: 10 }}>
            <AppText style={{ ...font(800), fontSize: 22, lineHeight: 28 }}>{"Let's add your first task"}</AppText>
            <AppText tone="secondary" style={{ fontSize: 15, lineHeight: 23 }}>
              {"Type it the way you'd say it. Loop picks up the day and time for you."}
            </AppText>
          </View>
          <View style={{ flex: 1 }} />
          <Bubble style={{ marginHorizontal: size.sideMargin, marginBottom: 14 }}>
            Try it: <AppText style={{ ...font(800), color: '#FFFFFF', fontSize: 14.5 }}>today 18:00</AppText> is turned into a time. Tap the arrow to save.
          </Bubble>
          <View accessibilityLabel="Add task" style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 22, paddingHorizontal: size.sideMargin, paddingBottom: 28 + insets.bottom, gap: 16 }}>
            {input(text, setText, saveTask, 'Plan my week today 18:00', 'Task')}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {chip ? (
                <View style={{ minHeight: 42, paddingHorizontal: 16, borderRadius: 14, backgroundColor: c.tint, justifyContent: 'center' }}>
                  <AppText style={{ ...font(700), fontSize: 14.5, color: c.accentText }}>{chip}</AppText>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Save task"
                accessibilityState={{ disabled: !parsed.title }}
                disabled={!parsed.title}
                onPress={saveTask}
                style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: parsed.title ? c.accent : c.line, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: c.tint }}
              >
                <Icon name="arrowRight" strokeWidth={2.4} color={c.onAccent} />
              </PressScale>
            </View>
          </View>
        </>
      ) : null}

      {step === 2 && task ? (
        <>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 14, paddingTop: 28, paddingBottom: 12, paddingHorizontal: size.sideMargin }}>
            {task.startTime ? 'Schedule' : 'Anytime today'}
          </AppText>
          <View style={{ marginHorizontal: size.sideMargin, backgroundColor: c.accent, borderRadius: 20, paddingVertical: 16, paddingLeft: 20, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <AppText style={{ ...font(700), fontSize: 16, color: c.onAccent }}>{task.title}</AppText>
              <AppText style={{ fontSize: 14, color: c.onAccentSecondary }}>{[task.startTime ? timeRange(task.startTime, task.endTime) : 'Today', 'Inbox'].join(' · ')}</AppText>
            </View>
            <PressScale
              accessibilityRole="checkbox"
              accessibilityState={{ checked: false }}
              accessibilityLabel={`Mark done: ${task.title}`}
              onPress={() => {
                useStore.getState().toggleDone(task.id);
                setStep(3);
              }}
              style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2.5, borderColor: '#FFFFFF' }} />
            </PressScale>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 10, paddingHorizontal: size.sideMargin }}>
            <Bubble style={{ maxWidth: 280 }}>{"Nice, it's on your day. Tap the circle when it's done. Don't worry, you can undo."}</Bubble>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ marginHorizontal: size.sideMargin, marginBottom: 32 + insets.bottom, borderRadius: 20, backgroundColor: c.card, paddingVertical: 18, paddingHorizontal: 20 }}>
            <AppText tone="secondary" style={{ fontSize: 14.5, lineHeight: 22 }}>
              {"Tasks you don't finish never disappear. Next morning, Loop asks what to do with them."}
            </AppText>
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <View style={{ marginTop: 24, marginHorizontal: size.sideMargin, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 18, backgroundColor: c.card, borderRadius: 18, borderWidth: 3, borderColor: c.tint }}>
            {input(note, setNote, saveNote, 'Ideas for the weekend', 'Dump a thought')}
          </View>
          <View style={{ paddingTop: 12, paddingHorizontal: size.sideMargin }}>
            <Bubble style={{ maxWidth: 300 }}>Not sure when? Dump it here. Loop helps you sort it into a task or a note later.</Bubble>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ paddingHorizontal: size.sideMargin, paddingBottom: 32 + insets.bottom, gap: 10 }}>
            <PrimaryButton label="Save and finish" onPress={saveNote} />
            <AppText tone="secondary" style={{ fontSize: 13.5, textAlign: 'center' }}>
              You can replay this anytime in Settings.
            </AppText>
          </View>
        </>
      ) : null}
    </KeyboardLift>
  );
}

/** Dark coach-mark bubble (#141A2E light, #2C3550 dark, as in NTut1 / DNTut1). */
function Bubble({ children, style }: { children: ReactNode; style?: object }) {
  const { scheme } = useTheme();
  return (
    <View accessibilityRole="text" style={[{ alignSelf: 'flex-start', maxWidth: 300, backgroundColor: scheme === 'dark' ? '#2C3550' : '#141A2E', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 }, style]}>
      <AppText style={{ color: '#FFFFFF', fontSize: 14.5, lineHeight: 21 }}>{children}</AppText>
    </View>
  );
}
