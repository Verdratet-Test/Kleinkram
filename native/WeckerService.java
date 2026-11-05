package de.kleinkram.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Klingelt, bis die Aufgabe in der App gelöst ist: Weckton in Schleife (Wecker-Lautstärke, wird lauter),
 * Vibration, Vollbild über dem Sperrbildschirm. Nach 20 Minuten hört er von selbst auf (Sicherheit).
 */
public class WeckerService extends Service {
    static final String CH = "kk_wecker_alarm_v1";
    static final int NOTIF_ID = 7301;
    static final long MAX_MS = 20 * 60 * 1000L;

    /** Aktuell klingelnder Wecker (für die App). */
    static volatile String curId = null, curLabel = null, curTask = null;
    static volatile long curSince = 0;

    private MediaPlayer mp;
    private Vibrator vib;
    private PowerManager.WakeLock wl;
    private final Handler h = new Handler(Looper.getMainLooper());
    private float vol = 0.15f;
    private boolean paused = false;

    @Override
    public IBinder onBind(Intent i) { return null; }

    static Intent openIntent(Context c, String id) {
        Intent o = new Intent(c, MainActivity.class);
        o.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        o.putExtra("kk_wecker", id == null ? "x" : id);
        return o;
    }

    @Override
    public int onStartCommand(Intent in, int flags, int startId) {
        String act = in == null ? "start" : String.valueOf(in.getAction());
        if ("stop".equals(act)) { stopAll(); return START_NOT_STICKY; }
        if ("pause".equals(act)) { pauseFor(in.getIntExtra("sek", 30)); return START_NOT_STICKY; }
        String id = in == null ? "x" : in.getStringExtra("id");
        String label = in == null ? null : in.getStringExtra("label");
        String sound = in == null ? "standard" : in.getStringExtra("sound");
        curTask = in == null ? null : in.getStringExtra("task");
        curId = id; curLabel = label == null || label.isEmpty() ? "Wecker" : label; curSince = System.currentTimeMillis();

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH) == null) {
            NotificationChannel ch = new NotificationChannel(CH, "Wecker", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Klingelt, bis du die Aufgabe gelöst hast");
            ch.setSound(null, null);
            ch.enableVibration(false);
            ch.setBypassDnd(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent full = PendingIntent.getActivity(this, 7302, openIntent(this, id), pf);
        Notification n = new NotificationCompat.Builder(this, CH)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle("⏰ " + curLabel)
                .setContentText("Tippen und Aufgabe lösen, um den Wecker auszuschalten")
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setFullScreenIntent(full, true)
                .setContentIntent(full)
                .addAction(0, "Aufgabe lösen", full)
                .build();
        try {
            ServiceCompat.startForeground(this, NOTIF_ID, n,
                    Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0);
        } catch (Throwable e) {
            startForeground(NOTIF_ID, n);
        }
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (wl == null) {
            wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "kleinkram:wecker");
            wl.acquire(MAX_MS + 60000);
        }
        startSound(sound);
        /* App direkt öffnen (klappt bei angeschaltetem Bildschirm; sonst übernimmt das Vollbild-Intent) */
        try { startActivity(openIntent(this, id)); } catch (Throwable ignored) { }
        WeckerPlugin.klingelt();
        h.removeCallbacksAndMessages(null);
        h.postDelayed(this::timeout, MAX_MS);
        h.postDelayed(ramp, 3000);
        return START_STICKY;
    }

    private void startSound(String sound) {
        stopSound();
        try {
            Uri u = null;
            if (sound == null || "standard".equals(sound)) u = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM);
            if (u == null) {
                String name = "kk_" + (sound == null || "standard".equals(sound) ? "wecker" : sound);
                int rid = getResources().getIdentifier(name, "raw", getPackageName());
                if (rid == 0) rid = getResources().getIdentifier("kk_wecker", "raw", getPackageName());
                u = Uri.parse("android.resource://" + getPackageName() + "/" + rid);
            }
            mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            mp.setDataSource(this, u);
            mp.setLooping(true);
            mp.setVolume(vol, vol);
            mp.prepare();
            mp.start();
        } catch (Throwable e) {
            try {
                int rid = getResources().getIdentifier("kk_wecker", "raw", getPackageName());
                mp = MediaPlayer.create(this, rid, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build(), 0);
                if (mp != null) { mp.setLooping(true); mp.start(); }
            } catch (Throwable ignored) { }
        }
        vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        long[] pat = {0, 800, 600};
        try {
            if (vib != null) {
                if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createWaveform(pat, 0),
                        new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
                else vib.vibrate(pat, 0);
            }
        } catch (Throwable ignored) { }
    }

    /** Lautstärke langsam steigern (sanft wecken, dann deutlich). */
    private final Runnable ramp = new Runnable() {
        @Override public void run() {
            if (mp == null) return;
            if (!paused && vol < 1f) { vol = Math.min(1f, vol + 0.08f); try { mp.setVolume(vol, vol); } catch (Throwable ignored) { } }
            if (vol < 1f) h.postDelayed(this, 3000);
        }
    };

    /** Während die Aufgabe gelöst wird: kurz Ruhe, danach klingelt es weiter. */
    private void pauseFor(int sek) {
        if (mp == null) return;
        paused = true;
        try { mp.pause(); } catch (Throwable ignored) { }
        try { if (vib != null) vib.cancel(); } catch (Throwable ignored) { }
        h.removeCallbacks(resume);
        h.postDelayed(resume, Math.max(5, Math.min(60, sek)) * 1000L);
    }

    private final Runnable resume = () -> {
        if (mp == null) return;
        paused = false;
        try { mp.start(); } catch (Throwable ignored) { }
        long[] pat = {0, 800, 600};
        try {
            if (vib != null) {
                if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createWaveform(pat, 0));
                else vib.vibrate(pat, 0);
            }
        } catch (Throwable ignored) { }
    };

    private void timeout() {
        String lab = curLabel;
        stopAll();
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
            nm.notify(7303, new NotificationCompat.Builder(this, CH).setSmallIcon(getApplicationInfo().icon)
                    .setContentTitle("Wecker verpasst: " + lab).setContentText("Er hat 20 Minuten geklingelt.")
                    .setContentIntent(PendingIntent.getActivity(this, 7304, openIntent(this, null), pf)).setAutoCancel(true).build());
        } catch (Throwable ignored) { }
    }

    private void stopSound() {
        try { if (mp != null) { mp.stop(); mp.release(); } } catch (Throwable ignored) { }
        mp = null;
        try { if (vib != null) vib.cancel(); } catch (Throwable ignored) { }
    }

    private void stopAll() {
        h.removeCallbacksAndMessages(null);
        stopSound();
        curId = null; curLabel = null; curTask = null; curSince = 0;
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Throwable ignored) { }
        wl = null;
        try { ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE); } catch (Throwable ignored) { }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        h.removeCallbacksAndMessages(null);
        stopSound();
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Throwable ignored) { }
        super.onDestroy();
    }
}
