package app.loop.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

/** Fires at the check-in time and posts a notification with a full-screen intent. */
class FullScreenReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    val title = intent.getStringExtra(EXTRA_TITLE) ?: return
    val body = intent.getStringExtra(EXTRA_BODY) ?: ""
    val url = intent.getStringExtra(EXTRA_URL) ?: "loop://checkin"

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL, "Morning check-in on the lock screen", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Shows the morning check-in full screen when the phone is locked"
        },
      )
    }

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
      .setCategory(Notification.CATEGORY_ALARM)
      .setContentIntent(open)
      .setFullScreenIntent(open, true)
      .setAutoCancel(true)
    if (Build.VERSION.SDK_INT < 26) {
      @Suppress("DEPRECATION")
      builder.setPriority(Notification.PRIORITY_MAX)
    }
    manager.notify(id.hashCode(), builder.build())
  }

  companion object {
    private const val CHANNEL = "loop-checkin-fullscreen"
    private const val EXTRA_ID = "loop.id"
    private const val EXTRA_TITLE = "loop.title"
    private const val EXTRA_BODY = "loop.body"
    private const val EXTRA_URL = "loop.url"

    fun openIntent(context: Context, url: String): Intent =
      Intent(Intent.ACTION_VIEW, Uri.parse(url))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

    fun pendingIntent(context: Context, id: String, title: String, body: String, url: String): PendingIntent {
      val intent = Intent(context, FullScreenReceiver::class.java)
        .setAction("app.loop.alarm.FULL_SCREEN.$id")
        .putExtra(EXTRA_ID, id)
        .putExtra(EXTRA_TITLE, title)
        .putExtra(EXTRA_BODY, body)
        .putExtra(EXTRA_URL, url)
      return PendingIntent.getBroadcast(context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
  }
}
