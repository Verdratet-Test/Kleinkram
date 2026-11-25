package de.kleinkram.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.provider.OpenableColumns;
import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

import com.getcapacitor.JSObject;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Kleine Brücke für Dinge, die es als fertiges Plugin nicht gibt: Kalender-Eintrag und Links nach außen. */
@CapacitorPlugin(name = "KleinkramNative")
public class KleinkramNativePlugin extends Plugin {

    static KleinkramNativePlugin inst;

    @Override
    public void load() { inst = this; }

    /** Von MainActivity gerufen, wenn eine PDF per „Öffnen mit“/„Teilen“ ankommt, während die App läuft. */
    static void neuGeteilt() { if (inst != null) inst.notifyListeners("geteilt", new JSObject(), true); }

    /** PDF, die mit „Öffnen mit Kleinkram“ oder „Teilen → Kleinkram“ geschickt wurde. Wird nur gelesen, nie verändert. */
    @PluginMethod
    public void geteilteDatei(PluginCall call) {
        JSObject r = new JSObject();
        Intent it = getActivity().getIntent();
        if (it == null) { call.resolve(r); return; }
        Uri u = null;
        String act = it.getAction();
        if (Intent.ACTION_VIEW.equals(act)) u = it.getData();
        else if (Intent.ACTION_SEND.equals(act)) u = it.getParcelableExtra(Intent.EXTRA_STREAM);
        if (u == null) { call.resolve(r); return; }
        /* nur einmal übernehmen (nicht nach Drehen oder Neustart der Ansicht nochmal) */
        getActivity().setIntent(new Intent(getActivity(), getActivity().getClass()));
        try (InputStream in = getContext().getContentResolver().openInputStream(u)) {
            if (in == null) { call.reject("Datei ließ sich nicht lesen"); return; }
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] b = new byte[65536];
            int n; long tot = 0;
            while ((n = in.read(b)) > 0) {
                tot += n;
                if (tot > 40_000_000L) { call.reject("Die Datei ist größer als 40 MB."); return; }
                bo.write(b, 0, n);
            }
            String name = "Dokument.pdf";
            try (Cursor c = getContext().getContentResolver().query(u, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                if (c != null && c.moveToFirst()) { String x = c.getString(0); if (x != null && !x.isEmpty()) name = x; }
            } catch (Exception ignored) { }
            if ("file".equals(u.getScheme()) && u.getLastPathSegment() != null) name = u.getLastPathSegment();
            String mime = getContext().getContentResolver().getType(u);
            r.put("name", name);
            r.put("mime", mime == null ? "" : mime);
            r.put("data", Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Datei ließ sich nicht lesen");
        }
    }

    @PluginMethod
    public void insertEvent(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_INSERT).setData(CalendarContract.Events.CONTENT_URI);
        i.putExtra(CalendarContract.Events.TITLE, call.getString("title", ""));
        String desc = call.getString("description", "");
        if (desc != null && !desc.isEmpty()) i.putExtra(CalendarContract.Events.DESCRIPTION, desc);
        String rrule = call.getString("rrule", "");
        if (rrule != null && !rrule.isEmpty()) i.putExtra(CalendarContract.Events.RRULE, rrule);
        Boolean allDay = call.getBoolean("allDay", false);
        i.putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, allDay != null && allDay);
        Double begin = call.getDouble("begin");
        Double end = call.getDouble("end");
        if (begin != null) i.putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, begin.longValue());
        if (end != null) i.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end.longValue());
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Keine Kalender-App gefunden");
        }
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url fehlt");
            return;
        }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Link ließ sich nicht öffnen");
        }
    }
}
