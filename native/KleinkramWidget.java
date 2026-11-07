package de.kleinkram.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Widget auf dem Startbildschirm: „Deine eine Sache“, nächster Wecker, Routinen des Tages zum Abhaken.
 * Die App schreibt die Daten (WeckerPlugin.widgetDaten); Abhaken im Widget merkt sich die Auswahl,
 * die App übernimmt sie beim nächsten Öffnen (WeckerPlugin.widgetAbgehakt).
 */
public class KleinkramWidget extends AppWidgetProvider {
    static final String PREFS = "kleinkram_widget";
    static final String TICK = "de.kleinkram.app.WIDGET_TICK";
    private static final int[] ROWS = {R.id.kk_w_r1, R.id.kk_w_r2, R.id.kk_w_r3, R.id.kk_w_r4};

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, views(c));
    }

    @Override
    public void onReceive(Context c, Intent in) {
        super.onReceive(c, in);
        if (in != null && TICK.equals(in.getAction())) {
            String rid = in.getStringExtra("id");
            SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            try {
                JSONObject d = new JSONObject(sp.getString("daten", "{}"));
                JSONArray rs = d.optJSONArray("routinen");
                boolean now = false;
                if (rs != null) for (int i = 0; i < rs.length(); i++) {
                    JSONObject r = rs.getJSONObject(i);
                    if (r.optString("id").equals(rid)) { now = !(r.optBoolean("done") && heute().equals(d.optString("tag"))); r.put("done", now); }
                }
                if (!heute().equals(d.optString("tag"))) {
                    /* neuer Tag: alte Haken zurücksetzen */
                    if (rs != null) for (int i = 0; i < rs.length(); i++) { JSONObject r = rs.getJSONObject(i); if (!r.optString("id").equals(rid)) r.put("done", false); }
                    d.put("tag", heute());
                }
                JSONObject t = new JSONObject(sp.getString("abgehakt", "{}"));
                t.put(rid, now);
                sp.edit().putString("daten", d.toString()).putString("abgehakt", t.toString()).apply();
            } catch (Throwable ignored) { }
            updateAll(c);
        }
    }

    static String heute() { return new SimpleDateFormat("yyyy-MM-dd", Locale.GERMANY).format(new Date()); }

    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, KleinkramWidget.class));
        for (int id : ids) m.updateAppWidget(id, views(c));
    }

    static RemoteViews views(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.kk_widget);
        int pf = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.kk_w_root, PendingIntent.getActivity(c, 7500, open, pf));
        try {
            JSONObject d = new JSONObject(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("daten", "{}"));
            boolean fresh = heute().equals(d.optString("tag"));
            v.setTextViewText(R.id.kk_w_eins, d.optString("eins", "Kleinkram öffnen"));
            String sub = d.optString("sub", "");
            v.setTextViewText(R.id.kk_w_sub, sub);
            v.setViewVisibility(R.id.kk_w_sub, sub.isEmpty() ? View.GONE : View.VISIBLE);
            String w = d.optString("wecker", "");
            v.setTextViewText(R.id.kk_w_wecker, w);
            v.setViewVisibility(R.id.kk_w_wecker, w.isEmpty() ? View.GONE : View.VISIBLE);
            JSONArray rs = d.optJSONArray("routinen");
            for (int i = 0; i < ROWS.length; i++) {
                if (rs != null && i < rs.length()) {
                    JSONObject r = rs.getJSONObject(i);
                    boolean done = fresh && r.optBoolean("done");
                    v.setTextViewText(ROWS[i], (done ? "✓  " : "○  ") + r.optString("t"));
                    v.setTextColor(ROWS[i], done ? 0xFF8A968E : 0xFF17201B);
                    v.setViewVisibility(ROWS[i], View.VISIBLE);
                    Intent t = new Intent(c, KleinkramWidget.class);
                    t.setAction(TICK);
                    t.putExtra("id", r.optString("id"));
                    v.setOnClickPendingIntent(ROWS[i], PendingIntent.getBroadcast(c, 7510 + i, t, pf));
                } else v.setViewVisibility(ROWS[i], View.GONE);
            }
            int more = d.optInt("mehr", 0);
            v.setTextViewText(R.id.kk_w_more, more > 0 ? "+" + more + " weitere Routinen" : "");
            v.setViewVisibility(R.id.kk_w_more, more > 0 ? View.VISIBLE : View.GONE);
        } catch (Throwable ignored) { }
        return v;
    }
}
