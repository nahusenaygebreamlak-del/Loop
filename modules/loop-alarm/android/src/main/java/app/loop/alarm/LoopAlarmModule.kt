package app.loop.alarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The full-screen morning check-in (Android full-screen intent), plus the two
 * permission screens it depends on. Expo's notification module can't do this part.
 */
class LoopAlarmModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "No React context" }

  override fun definition() = ModuleDefinition {
    Name("LoopAlarm")

    /** Android 14+ asks the user to allow full-screen alerts per app. */
    Function("canUseFullScreenIntent") {
      if (Build.VERSION.SDK_INT >= 34) {
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
      } else true
    }

    Function("openFullScreenSettings") {
      val intent = if (Build.VERSION.SDK_INT >= 34) {
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))
      } else {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      }
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Android 12+: "Alarms & reminders" permission for exact times. */
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT >= 31) {
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
      } else true
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= 31) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }

    /** Schedules a full-screen alert at `atMs` that opens `url` (e.g. loop://checkin). Same id replaces. */
    Function("scheduleFullScreen") { id: String, atMs: Double, title: String, body: String, url: String ->
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val fire = FullScreenReceiver.pendingIntent(context, id, title, body, url)
      val at = atMs.toLong()
      val exact = Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()
      if (exact) {
        val show = PendingIntent.getActivity(
          context, id.hashCode(), FullScreenReceiver.openIntent(context, url),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        alarms.setAlarmClock(AlarmManager.AlarmClockInfo(at, show), fire)
      } else {
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire)
      }
    }

    Function("cancelFullScreen") { id: String ->
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarms.cancel(FullScreenReceiver.pendingIntent(context, id, "", "", ""))
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(id.hashCode())
    }

    /** The check-in screen shows over the lock screen only while it is open. */
    AsyncFunction("setShowWhenLocked") { on: Boolean ->
      val activity = appContext.currentActivity ?: return@AsyncFunction
      if (Build.VERSION.SDK_INT >= 27) {
        activity.setShowWhenLocked(on)
        activity.setTurnScreenOn(on)
      }
    }.runOnQueue(Queues.MAIN)
  }
}
