package de.kleinkram.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.CalendarContract;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Kleine Brücke für Dinge, die es als fertiges Plugin nicht gibt: Kalender-Eintrag und Links nach außen. */
@CapacitorPlugin(name = "KleinkramNative")
public class KleinkramNativePlugin extends Plugin {

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
