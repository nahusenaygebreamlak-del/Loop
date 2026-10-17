import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class LoopAlarmModule extends NativeModule<Record<string, never>> {
  canUseFullScreenIntent(): boolean;
  openFullScreenSettings(): void;
  canScheduleExactAlarms(): boolean;
  openExactAlarmSettings(): void;
  scheduleFullScreen(id: string, atMs: number, title: string, body: string, url: string): void;
  cancelFullScreen(id: string): void;
  setShowWhenLocked(on: boolean): Promise<void>;
}

/** Null when the native module isn't in this build (web, or an old APK). */
export default requireOptionalNativeModule<LoopAlarmModule>('LoopAlarm');
