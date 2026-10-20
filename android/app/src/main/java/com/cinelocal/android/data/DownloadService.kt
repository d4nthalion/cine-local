package com.cinelocal.android.data

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import com.cinelocal.android.MainActivity
import com.cinelocal.android.core.DlState
import com.cinelocal.android.core.Space
import com.cinelocal.android.repo
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Servicio en primer plano que descarga la cola de [DownloadManager] de uno en uno, con una notificación
 * de progreso (Pausar / Cancelar). Sigue aunque se cierre la app; si Android mata el proceso,
 * la cola se reanuda desde los .part la próxima vez que se abre CineLocal.
 */
class DownloadService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var job: Job? = null
    private var lastStartId = 0
    private var foreground = false
    /** Lo que ya estaba descargado al empezar la tanda, para contar lo nuevo en el aviso final */
    private var doneAtStart: Set<String>? = null
    private val dl get() = applicationContext.repo.downloads

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        lastStartId = startId
        when (intent?.action) {
            ACTION_PAUSE -> dl.pauseAll()
            ACTION_CANCEL -> dl.cancelAll()
        }
        // con startForegroundService hay que pasar a primer plano enseguida, aunque no quede nada que hacer
        goForeground()
        if (job?.isActive != true) run()
        return START_NOT_STICKY
    }

    private fun run() {
        if (doneAtStart == null) doneAtStart = dl.index.value.finished.map { it.path }.toSet()
        job = scope.launch {
            dl.process { notifyProgress() }
            finish()
        }
    }

    /** Al vaciarse la cola: si entretanto llegó algo nuevo se sigue; si no, aviso final y fuera */
    private suspend fun finish() = withContext(Dispatchers.Main.immediate) {
        if (dl.index.value.next() != null) { run(); return@withContext }
        val idx = dl.index.value
        val before = doneAtStart.orEmpty()
        val doneNow = idx.finished.count { it.path !in before }
        doneAtStart = null
        val failed = idx.files.filter { it.state == DlState.ERROR }
        ServiceCompat.stopForeground(this@DownloadService, ServiceCompat.STOP_FOREGROUND_REMOVE)
        foreground = false
        if (doneNow > 0 || failed.isNotEmpty()) notifyDone(doneNow, failed.size, failed.firstOrNull()?.error)
        stopSelf(lastStartId)
    }

    private fun goForeground() {
        if (foreground) return
        ensureChannel(this)
        ServiceCompat.startForeground(
            this, NOTIF_ID, progressNotification(),
            if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC else 0
        )
        foreground = true
    }

    private fun notifyProgress() {
        if (!foreground) return
        runCatching { NotificationManagerCompat.from(this).notify(NOTIF_ID, progressNotification()) }
    }

    private fun progressNotification() = NotificationCompat.Builder(this, CHANNEL).apply {
        val a = dl.activity.value
        val f = a.file
        val queued = dl.index.value.pending.size
        val more = (queued - 1).coerceAtLeast(0)
        setSmallIcon(android.R.drawable.stat_sys_download)
        setOngoing(true)
        setOnlyAlertOnce(true)
        setSilent(true)
        setCategory(NotificationCompat.CATEGORY_PROGRESS)
        setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        setContentIntent(openDownloads(this@DownloadService))
        if (f == null) {
            setContentTitle("Descargas")
            setContentText("Preparando…")
            setProgress(0, 0, true)
        } else {
            setContentTitle(listOfNotNull(f.title, f.label?.substringBefore(" · ")).joinToString(" · "))
            val pct = if (f.size > 0) (f.done * 100 / f.size).toInt() else 0
            val text = a.waiting ?: buildString {
                append("${Space.fmt(f.done)} de ${Space.fmt(f.size)} · $pct %")
                if (a.bytesPerSec > 0) append(" · ${Space.fmt(a.bytesPerSec)}/s")
            }
            setContentText(text + if (more > 0) "  ·  $more más en cola" else "")
            if (a.waiting != null) setProgress(0, 0, true) else setProgress(1000, if (f.size > 0) (f.done * 1000 / f.size).toInt() else 0, false)
        }
        addAction(0, "Pausar", action(ACTION_PAUSE, 1))
        addAction(0, "Cancelar", action(ACTION_CANCEL, 2))
    }.build()

    private fun notifyDone(done: Int, failed: Int, error: String?) {
        val b = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(if (failed > 0) android.R.drawable.stat_notify_error else android.R.drawable.stat_sys_download_done)
            .setAutoCancel(true)
            .setContentIntent(openDownloads(this))
        if (failed > 0) {
            b.setContentTitle(if (failed == 1) "Una descarga no se pudo completar" else "$failed descargas no se pudieron completar")
            b.setContentText(listOfNotNull(error, if (done > 0) "$done terminadas" else null).joinToString(" · "))
        } else {
            b.setContentTitle(if (done == 1) "Descarga terminada" else "$done descargas terminadas")
            b.setContentText(if (done == 1) "Ya puedes verla sin conexión con el PC" else "Ya puedes verlas sin conexión con el PC")
        }
        runCatching { NotificationManagerCompat.from(this).notify(NOTIF_DONE_ID, b.build()) }
    }

    private fun action(name: String, code: Int) = PendingIntent.getService(
        this, code, Intent(this, DownloadService::class.java).setAction(name),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    /** Android 15: los servicios de sincronización tienen un tiempo máximo al día; se pausa y se reanuda al abrir la app */
    override fun onTimeout(startId: Int, fgsType: Int) {
        dl.pauseAll()
        job?.cancel()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val CHANNEL = "descargas"
        private const val NOTIF_ID = 41
        private const val NOTIF_DONE_ID = 42
        const val ACTION_PAUSE = "com.cinelocal.android.DL_PAUSE"
        const val ACTION_CANCEL = "com.cinelocal.android.DL_CANCEL"

        fun ensureChannel(ctx: Context) {
            val nm = ctx.getSystemService(NotificationManager::class.java) ?: return
            if (nm.getNotificationChannel(CHANNEL) != null) return
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL, "Descargas", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Progreso de las películas y episodios que descargas para ver sin conexión"
                    setShowBadge(false)
                }
            )
        }

        private fun openDownloads(ctx: Context) = PendingIntent.getActivity(
            ctx, 0,
            Intent(ctx, MainActivity::class.java)
                .putExtra(MainActivity.EXTRA_ROUTE, "downloads")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
