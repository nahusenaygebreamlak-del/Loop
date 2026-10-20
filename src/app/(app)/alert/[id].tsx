import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoopAlarm from '../../../../modules/loop-alarm';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { pushSnack } from '@/components/Snackbar';
import { goMain } from '@/features/nav';
import { haptic } from '@/lib/haptics';
import { timeRange } from '@/lib/dates';
import { snoozeAlert } from '@/notifications/schedule';
import { useStore } from '@/store/store';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, size } from '@/theme/tokens';
import { font } from '@/theme/typography';

/**
 * Full-screen task reminder (opened by the alert, also over the lock screen).
 * Not drawn in the designs yet; built from the check-in screen's layout.
 */
export default function Alert() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useStore((s) => s.tasks.find((t) => t.id === id));
  const list = useStore((s) => s.lists.find((l) => l.id === task?.listId));

  useEffect(() => {
    void LoopAlarm?.setShowWhenLocked(true);
    haptic('warning');
    return () => void LoopAlarm?.setShowWhenLocked(false);
  }, []);

  if (!task) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center', padding: size.sideMargin }}>
        <AppText tone="secondary">This task is gone.</AppText>
        <PrimaryButton label="Go to Today" onPress={() => goMain('/')} />
      </View>
    );
  }

  const done = () => {
    haptic('success');
    const undo = useStore.getState().toggleDone(task.id);
    goMain('/');
    pushSnack({ title: 'Task done', actions: [{ label: 'Undo', onPress: undo }] });
  };
  const snooze = (min: number) => {
    haptic('light');
    snoozeAlert(task.id, task.title, min);
    goMain('/');
    pushSnack({ title: `Reminding you again in ${min} min` });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: 24 + insets.top, paddingBottom: 28 + insets.bottom, paddingHorizontal: size.sideMargin }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText tone="secondary" style={{ ...font(600), fontSize: 14 }}>
          Reminder
        </AppText>
        <PressScale accessibilityRole="button" accessibilityLabel="Close reminder" onPress={() => goMain('/')} style={{ width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" color={c.text} />
        </PressScale>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 14, paddingBottom: 40 }}>
        <View aria-hidden style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={34} color={c.accentText} />
        </View>
        <AppText accessibilityRole="header" style={{ marginTop: 10, ...font(800), fontSize: 32, lineHeight: 38, letterSpacing: -0.64 }}>
          {task.title}
        </AppText>
        <AppText tone="secondary" style={{ fontSize: 16, lineHeight: 25 }}>
          {[task.startTime ? timeRange(task.startTime, task.endTime) : 'Today', list?.name].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={{ gap: 10 }}>
        <PrimaryButton label="Mark done" onPress={done} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[10, 30].map((m) => (
            <PressScale key={m} accessibilityRole="button" onPress={() => snooze(m)} style={{ flex: 1, minHeight: 52, borderRadius: 16, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ ...font(700), fontSize: 15 }}>{`Snooze ${m} min`}</AppText>
            </PressScale>
          ))}
        </View>
        <PressScale accessibilityRole="button" onPress={() => router.replace({ pathname: '/task/[id]', params: { id: task.id } })} style={{ minHeight: 48, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' }}>
          <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
            Open task
          </AppText>
        </PressScale>
      </View>
    </View>
  );
}
