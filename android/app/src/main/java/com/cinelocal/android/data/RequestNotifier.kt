package com.cinelocal.android.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.cinelocal.android.MainActivity
import com.cinelocal.android.R
import com.cinelocal.android.repo
import java.util.concurrent.TimeUnit

/**
 * Aviso en el teléfono cuando se resuelve una petición propia (conseguida o rechazada), aunque la app esté cerrada:
 * WorkManager la comprueba en el servidor cada ~15 minutos (Android decide el momento exacto para ahorrar batería).
 */
class RequestNotifier(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val s = ctx.repo.settings.value
        if (!s.server || s.serverUrl.isBlank() || s.serverToken.isBlank()) return Result.success()
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        // la primera vez sólo se apunta desde cuándo: no se avisa de lo resuelto antes de instalar esta versión
        val seen = prefs.getLong(SEEN, 0L)
        if (seen == 0L) { prefs.edit().putLong(SEEN, System.currentTimeMillis()).apply(); return Result.success() }
        val list = try { CineServer(s.serverUrl, s.serverToken).requests() } catch (_: Exception) { return Result.success() }
        val fresh = list.filter { it.mine && it.status != "pending" && (it.resolvedAt ?: 0) > seen }
        if (fresh.isEmpty()) return Result.success()
        ensureChannel(ctx)
        for (r in fresh) notify(ctx, r)
        prefs.edit().putLong(SEEN, fresh.maxOf { it.resolvedAt ?: 0 }).apply()
        return Result.success()
    }

    private fun notify(ctx: Context, r: CineServer.Req) {
        val name = r.title + (r.year?.let { " ($it)" } ?: "")
        val done = r.status == "done"
        val b = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(if (done) "Ya puedes verla: $name" else "Petición rechazada: $name")
            .setContentText(if (done) "Lo que pediste ya está en la biblioteca" else r.reply ?: "No se va a añadir a la biblioteca")
            .setStyle(NotificationCompat.BigTextStyle().bigText(
                if (done) "Lo que pediste ya está en la biblioteca" + (r.reply?.let { ". «$it»" } ?: "") else r.reply ?: "No se va a añadir a la biblioteca"
            ))
            .setAutoCancel(true)
            .setContentIntent(PendingIntent.getActivity(
                ctx, 0,
                Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            ))
        runCatching { NotificationManagerCompat.from(ctx).notify(r.id.hashCode(), b.build()) }
    }

    companion object {
        private const val CHANNEL = "peticiones"
        private const val PREFS = "peticiones"
        private const val SEEN = "vistasHasta"
        private const val WORK = "peticiones"

        /** Comprobación periódica y, además, una ahora (al abrir la app) */
        fun schedule(ctx: Context) {
            val net = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            val wm = WorkManager.getInstance(ctx)
            wm.enqueueUniquePeriodicWork(
                WORK, ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<RequestNotifier>(15, TimeUnit.MINUTES).setConstraints(net).build()
            )
            wm.enqueueUniqueWork("$WORK-ahora", ExistingWorkPolicy.REPLACE, OneTimeWorkRequestBuilder<RequestNotifier>().setConstraints(net).build())
        }

        private fun ensureChannel(ctx: Context) {
            val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
            if (nm.getNotificationChannel(CHANNEL) != null) return
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL, "Peticiones", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Cuando lo que has pedido llega a la biblioteca o se rechaza"
                }
            )
        }
    }
}
