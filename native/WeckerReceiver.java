package de.kleinkram.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Plant die Wecker beim System ein (AlarmManager.setAlarmClock – wie eine echte Wecker-App, auch im Ruhezustand pünktlich)
 * und startet zur Weckzeit das Klingeln. Nach Neustart/Update werden alle Wecker neu eingeplant.
 *
 * Regeln (aus der App): {id, h, m, days:[1..7 = Mo..So] (leer = einmalig), date:"JJJJ-MM-TT"|null, at:ms (Schlummern), label, sound, task}
 */
public class WeckerReceiver extends BroadcastReceiver {
    static final String PREFS = "kleinkram_wecker";
    static final String ACTION = "de.kleinkram.app.WECKER";

    @Override
    public void onReceive(Context c, Intent in) {
        String a = in == null ? null : in.getAction();
        if (ACTION.equals(a)) {
            String id = in.getStringExtra("id");
            Intent s = new Intent(c, WeckerService.class);
            s.setAction("start");
            s.putExtra("id", id);
            s.putExtra("label", in.getStringExtra("label"));
            s.putExtra("sound", in.getStringExtra("sound"));
            s.putExtra("task", in.getStringExtra("task"));
            try { ContextCompat.startForegroundService(c, s); } catch (Throwable ignored) { }
            /* einmalige Wecker / Schlummern sind damit erledigt */
            try {
                JSONArray rs = rules(c), keep = new JSONArray();
                for (int i = 0; i < rs.length(); i++) {
                    JSONObject r = rs.getJSONObject(i);
                    boolean once = r.optJSONArray("days") == null || r.optJSONArray("days").length() == 0;
                    if (r.optString("id").equals(id) && (once || r.has("at"))) continue;
                    keep.put(r);
                }
                save(c, keep);
            } catch (Throwable ignored) { }
        }
        planAll(c);
    }

    static JSONArray rules(Context c) {
        try { return new JSONArray(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("regeln", "[]")); }
        catch (Throwable e) { return new JSONArray(); }
    }

    static void save(Context c, JSONArray rs) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("regeln", rs.toString()).apply();
    }

    /** Nächster Zeitpunkt einer Regel nach „jetzt“ (ms) oder 0. */
    static long next(JSONObject r, long now) {
        if (r.has("at")) { long at = r.optLong("at"); return at > now ? at : 0; }
        int hh = r.optInt("h"), mm = r.optInt("m");
        JSONArray days = r.optJSONArray("days");
        String date = r.optString("date", "");
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (days == null || days.length() == 0) {
            if (date != null && date.length() == 10) {
                try {
                    cal.set(Integer.parseInt(date.substring(0, 4)), Integer.parseInt(date.substring(5, 7)) - 1, Integer.parseInt(date.substring(8, 10)), hh, mm, 0);
                    return cal.getTimeInMillis() > now ? cal.getTimeInMillis() : 0;
                } catch (Throwable e) { return 0; }
            }
            cal.set(Calendar.HOUR_OF_DAY, hh);
            cal.set(Calendar.MINUTE, mm);
            if (cal.getTimeInMillis() <= now) cal.add(Calendar.DAY_OF_YEAR, 1);
            return cal.getTimeInMillis();
        }
        for (int d = 0; d < 8; d++) {
            Calendar x = (Calendar) cal.clone();
            x.add(Calendar.DAY_OF_YEAR, d);
            x.set(Calendar.HOUR_OF_DAY, hh);
            x.set(Calendar.MINUTE, mm);
            int wd = ((x.get(Calendar.DAY_OF_WEEK) + 5) % 7) + 1; /* Mo=1 … So=7 */
            boolean on = false;
            for (int i = 0; i < days.length(); i++) if (days.optInt(i) == wd) on = true;
            if (on && x.getTimeInMillis() > now) return x.getTimeInMillis();
        }
        return 0;
    }

    private static PendingIntent pi(Context c, JSONObject r) {
        Intent i = new Intent(c, WeckerReceiver.class);
        i.setAction(ACTION);
        i.putExtra("id", r.optString("id"));
        i.putExtra("label", r.optString("label", "Wecker"));
        i.putExtra("sound", r.optString("sound", "standard"));
        i.putExtra("task", r.optString("task", ""));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(c, 7400 + Math.abs(r.optString("id").hashCode() % 5000), i, flags);
    }

    /** Alle Regeln neu einplanen, alte Einträge zurückziehen. Gibt den nächsten Zeitpunkt zurück. */
    static long planAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis(), first = 0;
        try {
            JSONArray old = new JSONArray(sp.getString("geplant", "[]"));
            for (int i = 0; i < old.length(); i++) {
                JSONObject o = new JSONObject();
                o.put("id", old.getString(i));
                try { am.cancel(pi(c, o)); } catch (Throwable ignored) { }
            }
        } catch (Throwable ignored) { }
        JSONArray rs = rules(c), planned = new JSONArray();
        for (int i = 0; i < rs.length(); i++) {
            try {
                JSONObject r = rs.getJSONObject(i);
                long t = next(r, now);
                if (t <= 0) continue;
                PendingIntent show = PendingIntent.getActivity(c, 7399, WeckerService.openIntent(c, null),
                        PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(t, show), pi(c, r));
                planned.put(r.optString("id"));
                if (first == 0 || t < first) first = t;
            } catch (Throwable ignored) { }
        }
        sp.edit().putString("geplant", planned.toString()).putLong("naechster", first).apply();
        return first;
    }
}
