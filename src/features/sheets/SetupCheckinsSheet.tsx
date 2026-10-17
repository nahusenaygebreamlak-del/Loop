import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import LoopAlarm from '../../../modules/loop-alarm';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/PressScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SheetCard, useCloseSheet, useSheets } from '@/components/Sheet';
import { formatTime, type TimeKey } from '@/lib/dates';
import { askForNotifications } from '@/notifications/setup';
import { useLocal } from '@/store/local';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { font } from '@/theme/typography';
import { CheckinTimeSheet } from './SettingsSheets';

/** NSetupCheckins, then NSetupFullScreen (Android only). Offered once, the first time tasks are left over. */
export function SetupCheckinsSheet({ leftCount }: { leftCount: number }) {
  const { c } = useTheme();
  const close = useCloseSheet();
  const sheets = useSheets();
  const [morning, setMorning] = useState<TimeKey>('08:30');
  const [afternoon, setAfternoon] = useState<TimeKey>('14:00');
  const [step, setStep] = useState<'times' | 'fullscreen'>('times');
  const canFullScreen = Platform.OS === 'android' && !!LoopAlarm;

  const done = (fullScreen: boolean) => {
    close();
    useSettings.getState().set({ fullScreen });
    router.push('/setup/checkins-on');
  };

  if (step === 'fullscreen') {
    return (
      <SheetCard label="Full-screen alerts" gap={18} style={{ paddingBottom: 32 }}>
        <View>
          <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 24, lineHeight: 30 }}>
            Want the morning check-in to fill your screen?
          </AppText>
          <AppText tone="secondary" style={{ marginTop: 10, fontSize: 15.5, lineHeight: 24 }}>
            Harder to miss than a banner. Android needs you to allow it once in settings.
          </AppText>
        </View>
        <View aria-hidden style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 20, padding: 12, gap: 10, alignItems: 'center', backgroundColor: c.ground }}>
            <View style={{ alignSelf: 'stretch', height: 150, borderRadius: 14, backgroundColor: c.line, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 8, right: 8, top: 10, height: 34, borderRadius: 9, backgroundColor: c.card }} />
            </View>
            <AppText tone="secondary" style={{ ...font(700), fontSize: 13.5 }}>
              Banner
            </AppText>
          </View>
          <View style={{ flex: 1, borderRadius: 20, padding: 12, gap: 10, alignItems: 'center', backgroundColor: c.tint }}>
            <View style={{ alignSelf: 'stretch', height: 150, borderRadius: 14, backgroundColor: c.card, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 12, right: 12, top: 18, height: 10, borderRadius: 5, backgroundColor: c.text }} />
              <View style={{ position: 'absolute', left: 12, right: 40, top: 36, height: 8, borderRadius: 4, backgroundColor: c.line }} />
              <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, height: 22, borderRadius: 8, backgroundColor: c.accent }} />
            </View>
            <AppText style={{ ...font(700), fontSize: 13.5, color: c.accentText }}>Full screen</AppText>
          </View>
        </View>
        <View style={{ gap: 2 }}>
          {[
            ['Tap ', 'Open settings', ''],
            ['Turn on ', 'Full-screen alerts', ' for Loop'],
            ['Come back here', '', ''],
          ].map(([a, b, d], i) => (
            <AppText key={i} tone="secondary" style={{ fontSize: 14.5, lineHeight: 23 }}>
              {`${i + 1}.  ${a}`}
              {b ? <AppText style={{ ...font(800), fontSize: 14.5, color: c.text }}>{b}</AppText> : null}
              {d}
            </AppText>
          ))}
        </View>
        <View style={{ gap: 8 }}>
          <PrimaryButton
            label="Open settings"
            onPress={() => {
              LoopAlarm?.openFullScreenSettings();
              done(true);
            }}
          />
          <PressScale accessibilityRole="button" onPress={() => done(false)} style={{ minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
              Keep the banner
            </AppText>
          </PressScale>
        </View>
      </SheetCard>
    );
  }

  const row = (label: string, hint: string, value: TimeKey, kind: 'morningTime' | 'afternoonTime', set: (t: TimeKey) => void, last?: boolean) => (
    <PressScale
      kind="row"
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatTime(value)}. Change time`}
      onPress={() => sheets.open(() => <CheckinTimeSheet kind={kind} initial={value} onSave={set} />)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 18, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.card }}
    >
      <View style={{ flex: 1 }}>
        <AppText style={{ ...font(700), fontSize: 15.5 }}>{label}</AppText>
        <AppText tone="secondary" style={{ fontSize: 13, marginTop: 2 }}>
          {hint}
        </AppText>
      </View>
      <AppText style={{ ...font(800), fontSize: 17, color: c.accentText, fontVariant: ['tabular-nums'] }}>{formatTime(value)}</AppText>
    </PressScale>
  );

  return (
    <SheetCard label="Meet the check-ins" gap={18} style={{ paddingBottom: 32 }}>
      <View aria-hidden style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="sun" size={28} color={c.accentText} />
      </View>
      <View>
        <AppText accessibilityRole="header" style={{ ...font(800), fontSize: 24, lineHeight: 30 }}>
          {`${leftCount} task${leftCount === 1 ? '' : 's'} didn't get done yesterday`}
        </AppText>
        <AppText tone="secondary" style={{ marginTop: 10, fontSize: 15.5, lineHeight: 24 }}>
          {"That's normal. Loop can check in with you each morning to sort leftovers, and in the afternoon to see what's still open."}
        </AppText>
      </View>
      <View style={{ backgroundColor: c.ground, borderRadius: 20, overflow: 'hidden' }}>
        {row('Morning', 'Plan the day, sort leftovers', morning, 'morningTime', setMorning)}
        {row('Afternoon', 'Only if something is still open', afternoon, 'afternoonTime', setAfternoon, true)}
      </View>
      <View style={{ gap: 8, marginTop: 4 }}>
        <PrimaryButton
          label="Turn on check-ins"
          onPress={() => {
            useLocal.setState({ checkinsOffered: true });
            useSettings.getState().set({ morningTime: morning, afternoonTime: afternoon });
            void askForNotifications().catch(() => false);
            if (canFullScreen) setStep('fullscreen');
            else done(false);
          }}
        />
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            useLocal.setState({ checkinsOffered: true });
            close();
          }}
          style={{ minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText tone="secondary" style={{ ...font(700), fontSize: 15 }}>
            Not now
          </AppText>
        </PressScale>
      </View>
    </SheetCard>
  );
}
