import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class LoopAlarmModule extends NativeModule<Record<string, never>> {
  canUseFullScreenIntent(): boolean;
  openFullScreenSettings(): void;
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): void;
  /** Sound, vibration and a lit screen at `atMs`; full screen when `fullScreen`; `wakeOnly` only lights the screen. */
  scheduleAlert(id: string, atMs: number, title: string, body: string, url: string, fullScreen: boolean, wakeOnly: boolean): void;
  cancelAlert(id: string): void;
  setShowWhenLocked(on: boolean): Promise<void>;
}

/** Null when the native module isn't in this build (web, or an old APK). */
export default requireOptionalNativeModule<LoopAlarmModule>('LoopAlarm');
