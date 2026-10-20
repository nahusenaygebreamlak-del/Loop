package app.loop.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager

/**
 * Fires at an alert's time (task reminder or check-in): lights up the screen, and unless it's
 * only a wake-up for a check-in Expo already shows, posts a notification with sound and
 * vibration — full screen over the lock screen when the person turned that on.
 */
class FullScreenReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    wakeScreen(context)
    if (intent.getBooleanExtra(EXTRA_WAKE_ONLY, false)) return

    val title = intent.getStringExtra(EXTRA_TITLE) ?: return
    val body = intent.getStringExtra(EXTRA_BODY) ?: ""
    val url = intent.getStringExtra(EXTRA_URL) ?: "loop://checkin"
    val fullScreen = intent.getBooleanExtra(EXTRA_FULL, false)

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(manager)

    val open = PendingIntent.getActivity(
      context, id.hashCode(), openIntent(context, url),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
    builder
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(Notification.BigTextStyle().bigText(body))
      .setCategory(if (fullScreen) Notification.CATEGORY_ALARM else Notification.CATEGORY_REMINDER)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setContentIntent(open)
      .setAutoCancel(true)
    if (fullScreen) builder.setFullScreenIntent(open, true)
    if (Build.VERSION.SDK_INT < 26) {
      @Suppress("DEPRECATION")
      builder.setPriority(Notification.PRIORITY_MAX).setDefaults(Notification.DEFAULT_ALL).setVibrate(VIBRATION)
    }
    manager.notify(id.hashCode(), builder.build())
  }

  companion object {
    /** New id: Android never lets an app change an existing channel's sound or vibration. */
    private const val CHANNEL = "loop-alerts-v2"
    private val VIBRATION = longArrayOf(0, 400, 200, 400)
    private const val EXTRA_ID = "loop.id"
    private const val EXTRA_TITLE = "loop.title"
    private const val EXTRA_BODY = "loop.body"
    private const val EXTRA_URL = "loop.url"
    private const val EXTRA_FULL = "loop.full"
    private const val EXTRA_WAKE_ONLY = "loop.wakeOnly"

    fun ensureChannel(manager: NotificationManager) {
      if (Build.VERSION.SDK_INT < 26) return
      manager.deleteNotificationChannel("loop-checkin-fullscreen")
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL, "Reminders and check-ins", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Task reminders and check-ins, with sound and vibration"
          enableVibration(true)
          vibrationPattern = VIBRATION
          enableLights(true)
          lightColor = 0xFF2F6BE3.toInt()
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
          setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
        },
      )
    }

    /** Turns the screen on for a few seconds, like an incoming message. */
    @Suppress("DEPRECATION")
    fun wakeScreen(context: Context) {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      if (power.isInteractive) return
      power.newWakeLock(
        PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
        "loop:alert",
      ).acquire(5_000)
    }

    fun openIntent(context: Context, url: String): Intent =
      Intent(Intent.ACTION_VIEW, Uri.parse(url))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    fun pendingIntent(context: Context, id: String, title: String, body: String, url: String, fullScreen: Boolean, wakeOnly: Boolean): PendingIntent {
      val intent = Intent(context, FullScreenReceiver::class.java)
        .setAction("app.loop.alarm.ALERT.$id")
        .putExtra(EXTRA_ID, id)
        .putExtra(EXTRA_TITLE, title)
        .putExtra(EXTRA_BODY, body)
        .putExtra(EXTRA_URL, url)
        .putExtra(EXTRA_FULL, fullScreen)
        .putExtra(EXTRA_WAKE_ONLY, wakeOnly)
      return PendingIntent.getBroadcast(context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
  }
}
