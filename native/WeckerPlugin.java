package de.kleinkram.app;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.WindowManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/** Wecker mit Aufgabe: Einplanen, Klingel-Status, Pause/Stopp/Schlummern, Einstellungen öffnen. */
@CapacitorPlugin(name = "Wecker")
public class WeckerPlugin extends Plugin {
    private static WeckerPlugin inst;

    @Override
    public void load() { inst = this; }

    /** Vom Dienst aufgerufen, wenn es klingelt. */
    static void klingelt() {
        WeckerPlugin p = inst;
        if (p == null) return;
        try {
            p.notifyListeners("klingelt", aktivObj(), true);
            p.sperrbild(true);
        } catch (Throwable ignored) { }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (intent != null && intent.hasExtra("kk_wecker") && WeckerService.curId != null) {
            sperrbild(true);
            notifyListeners("klingelt", aktivObj(), true);
        }
    }

    private static JSObject aktivObj() {
        if (WeckerService.curId == null) return null;
        JSObject o = new JSObject();
        o.put("id", WeckerService.curId);
        o.put("label", WeckerService.curLabel);
        o.put("task", WeckerService.curTask);
        o.put("seit", WeckerService.curSince);
        return o;
    }

    /** Über dem Sperrbildschirm anzeigen und Bildschirm anschalten, solange es klingelt. */
    void sperrbild(boolean an) {
        Activity a = getActivity();
        if (a == null) return;
        a.runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= 27) { a.setShowWhenLocked(an); a.setTurnScreenOn(an); }
                else if (an) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
                else a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
                if (an) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } catch (Throwable ignored) { }
        });
    }

    @PluginMethod
    public void planen(PluginCall call) {
        JSArray rs = call.getArray("regeln");
        Context c = getContext();
        try {
            /* laufendes Schlummern behalten */
            JSONArray old = WeckerReceiver.rules(c), neu = new JSONArray();
            for (int i = 0; i < old.length(); i++) { JSONObject r = old.getJSONObject(i); if (r.has("at")) neu.put(r); }
            if (rs != null) for (int i = 0; i < rs.length(); i++) neu.put(rs.getJSONObject(i));
            WeckerReceiver.save(c, neu);
        } catch (Throwable e) { call.reject("Wecker konnten nicht gespeichert werden: " + e.getMessage()); return; }
        long first = WeckerReceiver.planAll(c);
        JSObject r = new JSObject();
        r.put("naechster", first);
        call.resolve(r);
    }

    @PluginMethod
    public void status(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        r.put("exact", Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms());
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        r.put("fullScreen", Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent());
        r.put("notif", Build.VERSION.SDK_INT < 24 || nm.areNotificationsEnabled());
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        r.put("akku", Build.VERSION.SDK_INT < 23 || pm.isIgnoringBatteryOptimizations(c.getPackageName()));
        r.put("naechster", c.getSharedPreferences(WeckerReceiver.PREFS, Context.MODE_PRIVATE).getLong("naechster", 0));
        r.put("aktiv", aktivObj());
        call.resolve(r);
    }

    private void svc(String action, Intent extra) {
        Intent s = new Intent(getContext(), WeckerService.class);
        s.setAction(action);
        if (extra != null) s.putExtras(extra);
        try { getContext().startService(s); } catch (Throwable ignored) { }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        Intent x = new Intent();
        x.putExtra("sek", call.getInt("sek", 30));
        svc("pause", x);
        call.resolve();
    }

    @PluginMethod
    public void stoppen(PluginCall call) {
        svc("stop", null);
        sperrbild(false);
        call.resolve();
    }

    /** Klingeln beenden und in X Minuten nochmal (auch für den „Bist du wach?“-Check). */
    @PluginMethod
    public void schlummern(PluginCall call) {
        int min = Math.max(1, Math.min(60, call.getInt("min", 5)));
        Context c = getContext();
        try {
            JSONObject r = new JSONObject();
            r.put("id", call.getString("id", "snz"));
            r.put("at", System.currentTimeMillis() + min * 60000L);
            r.put("label", call.getString("label", WeckerService.curLabel == null ? "Wecker" : WeckerService.curLabel));
            r.put("sound", call.getString("sound", "standard"));
            r.put("task", call.getString("task", WeckerService.curTask == null ? "" : WeckerService.curTask));
            JSONArray rs = WeckerReceiver.rules(c), neu = new JSONArray();
            for (int i = 0; i < rs.length(); i++) if (!rs.getJSONObject(i).optString("id").equals(r.getString("id"))) neu.put(rs.getJSONObject(i));
            neu.put(r);
            WeckerReceiver.save(c, neu);
        } catch (Throwable ignored) { }
        if (call.getBoolean("stop", true)) { svc("stop", null); sperrbild(false); }
        JSObject o = new JSObject();
        o.put("naechster", WeckerReceiver.planAll(c));
        call.resolve(o);
    }

    /** Geplantes Schlummern/Wach-Check zurücknehmen. */
    @PluginMethod
    public void abbrechen(PluginCall call) {
        String id = call.getString("id", "");
        Context c = getContext();
        try {
            JSONArray rs = WeckerReceiver.rules(c), neu = new JSONArray();
            for (int i = 0; i < rs.length(); i++) if (!rs.getJSONObject(i).optString("id").equals(id)) neu.put(rs.getJSONObject(i));
            WeckerReceiver.save(c, neu);
        } catch (Throwable ignored) { }
        JSObject o = new JSObject();
        o.put("naechster", WeckerReceiver.planAll(c));
        call.resolve(o);
    }

    /** Sofort klingeln lassen (zum Ausprobieren). */
    @PluginMethod
    public void testen(PluginCall call) {
        Intent s = new Intent(getContext(), WeckerService.class);
        s.setAction("start");
        s.putExtra("id", call.getString("id", "test"));
        s.putExtra("label", call.getString("label", "Test-Wecker"));
        s.putExtra("sound", call.getString("sound", "standard"));
        s.putExtra("task", call.getString("task", ""));
        try { androidx.core.content.ContextCompat.startForegroundService(getContext(), s); call.resolve(); }
        catch (Throwable e) { call.reject("Ging nicht: " + e.getMessage()); }
    }

    @PluginMethod
    public void einstellungen(PluginCall call) {
        String was = call.getString("was", "app");
        Context c = getContext();
        Intent i;
        try {
            if ("exact".equals(was) && Build.VERSION.SDK_INT >= 31)
                i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + c.getPackageName()));
            else if ("fullscreen".equals(was) && Build.VERSION.SDK_INT >= 34)
                i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + c.getPackageName()));
            else if ("akku".equals(was))
                i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + c.getPackageName()));
            else
                i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
        } catch (Throwable e) {
            try {
                Intent j = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()));
                j.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(j);
            } catch (Throwable ignored) { }
        }
        call.resolve();
    }

    /** Widget: Daten aus der App übernehmen und alle Widgets neu zeichnen. */
    @PluginMethod
    public void widgetDaten(PluginCall call) {
        Context c = getContext();
        c.getSharedPreferences(KleinkramWidget.PREFS, Context.MODE_PRIVATE).edit().putString("daten", call.getString("daten", "{}")).apply();
        try { KleinkramWidget.updateAll(c); } catch (Throwable ignored) { }
        call.resolve();
    }

    /** Widget: im Widget abgehakte Routinen abholen (und leeren). */
    @PluginMethod
    public void widgetAbgehakt(PluginCall call) {
        android.content.SharedPreferences sp = getContext().getSharedPreferences(KleinkramWidget.PREFS, Context.MODE_PRIVATE);
        JSObject r = new JSObject();
        try { r.put("ticks", new JSObject(sp.getString("abgehakt", "{}"))); } catch (Throwable e) { r.put("ticks", new JSObject()); }
        sp.edit().putString("abgehakt", "{}").apply();
        call.resolve(r);
    }
}
