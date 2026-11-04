package de.kleinkram.app;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageDecoder;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Size;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.label.ImageLabel;
import com.google.mlkit.vision.label.ImageLabeler;
import com.google.mlkit.vision.label.ImageLabeling;
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions;
import com.google.mlkit.common.model.LocalModel;
import com.google.mlkit.vision.label.custom.CustomImageLabelerOptions;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/**
 * Handy aufräumen: Fotos/Videos über MediaStore (Systemdialog vor jedem Ändern),
 * Dateien über "Zugriff auf alle Dateien". Nichts passiert ohne Bestätigung.
 */
@CapacitorPlugin(
    name = "Aufraeumen",
    permissions = {
        @Permission(alias = "media", strings = { Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO }),
        @Permission(alias = "mediaAlt", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_MEDIA_LOCATION })
    }
)
public class AufraeumenPlugin extends Plugin {

    private ActivityResultLauncher<IntentSenderRequest> senderLauncher;
    private PluginCall pendingCall;
    private Runnable afterGrant;

    @Override
    public void load() {
        senderLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            this::onSenderResult
        );
        new Thread(this::cleanPreviewCache).start();
    }

    private void onSenderResult(ActivityResult result) {
        PluginCall call = pendingCall;
        Runnable next = afterGrant;
        pendingCall = null;
        afterGrant = null;
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_OK) {
            if (next != null) new Thread(next).start();
            else {
                JSObject r = new JSObject();
                r.put("ok", true);
                call.resolve(r);
            }
        } else {
            JSObject r = new JSObject();
            r.put("ok", false);
            r.put("abgebrochen", true);
            call.resolve(r);
        }
    }

    private String mediaAlias() {
        return Build.VERSION.SDK_INT >= 33 ? "media" : "mediaAlt";
    }

    // ---------- Zugriff ----------

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("sdk", Build.VERSION.SDK_INT);
        PermissionState s = getPermissionState(mediaAlias());
        r.put("media", s == null ? "prompt" : s.toString().toLowerCase());
        r.put("files", Build.VERSION.SDK_INT >= 30 && Environment.isExternalStorageManager());
        PermissionState l = Build.VERSION.SDK_INT >= 29 ? getPermissionState("location") : PermissionState.GRANTED;
        r.put("loc", l == null ? "prompt" : l.toString().toLowerCase());
        call.resolve(r);
    }

    @PluginMethod
    public void requestLocation(PluginCall call) {
        if (Build.VERSION.SDK_INT < 29 || getPermissionState("location") == PermissionState.GRANTED) {
            status(call);
            return;
        }
        requestPermissionForAlias("location", call, "mediaPermResult");
    }

    @PluginMethod
    public void requestMedia(PluginCall call) {
        if (getPermissionState(mediaAlias()) == PermissionState.GRANTED) {
            status(call);
            return;
        }
        requestPermissionForAlias(mediaAlias(), call, "mediaPermResult");
    }

    @PermissionCallback
    private void mediaPermResult(PluginCall call) {
        status(call);
    }

    @PluginMethod
    public void openFilesAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT < 30) {
            call.reject("Dafür ist Android 11 oder neuer nötig.");
            return;
        }
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            i.setData(Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
        } catch (Exception e) {
            Intent i = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
        }
        call.resolve();
    }

    // ---------- Fotos & Videos ----------

    private Uri collection(String kind) {
        if ("video".equals(kind)) return MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
        return MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
    }

    private Uri itemUri(JSONObject it) {
        return ContentUris.withAppendedId(collection(it.optString("kind", "image")), it.optLong("id"));
    }

    @PluginMethod
    public void scanMedia(PluginCall call) {
        final boolean trashed = call.getBoolean("trashed", false);
        new Thread(() -> {
            try {
                JSArray out = new JSArray();
                queryKind("image", trashed, out);
                queryKind("video", trashed, out);
                JSObject r = new JSObject();
                r.put("items", out);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Fotos konnten nicht gelesen werden: " + e.getMessage());
            }
        }).start();
    }

    private void queryKind(String kind, boolean trashed, JSArray out) {
        ContentResolver cr = getContext().getContentResolver();
        List<String> cols = new ArrayList<>();
        cols.add(MediaStore.MediaColumns._ID);
        cols.add(MediaStore.MediaColumns.DISPLAY_NAME);
        cols.add(MediaStore.MediaColumns.SIZE);
        cols.add(MediaStore.MediaColumns.DATE_MODIFIED);
        cols.add(MediaStore.MediaColumns.MIME_TYPE);
        cols.add(MediaStore.MediaColumns.WIDTH);
        cols.add(MediaStore.MediaColumns.HEIGHT);
        cols.add("datetaken");
        cols.add("bucket_display_name");
        if (Build.VERSION.SDK_INT >= 29) cols.add(MediaStore.MediaColumns.RELATIVE_PATH);
        String[] proj = cols.toArray(new String[0]);
        Cursor c;
        if (Build.VERSION.SDK_INT >= 30) {
            Bundle args = new Bundle();
            args.putInt(MediaStore.QUERY_ARG_MATCH_TRASHED, trashed ? MediaStore.MATCH_ONLY : MediaStore.MATCH_EXCLUDE);
            args.putInt(MediaStore.QUERY_ARG_MATCH_PENDING, MediaStore.MATCH_EXCLUDE);
            c = cr.query(collection(kind), proj, args, null);
        } else {
            if (trashed) return;
            c = cr.query(collection(kind), proj, null, null, null);
        }
        if (c == null) return;
        try {
            int iId = c.getColumnIndex(MediaStore.MediaColumns._ID);
            int iName = c.getColumnIndex(MediaStore.MediaColumns.DISPLAY_NAME);
            int iSize = c.getColumnIndex(MediaStore.MediaColumns.SIZE);
            int iMod = c.getColumnIndex(MediaStore.MediaColumns.DATE_MODIFIED);
            int iMime = c.getColumnIndex(MediaStore.MediaColumns.MIME_TYPE);
            int iW = c.getColumnIndex(MediaStore.MediaColumns.WIDTH);
            int iH = c.getColumnIndex(MediaStore.MediaColumns.HEIGHT);
            int iTaken = c.getColumnIndex("datetaken");
            int iBucket = c.getColumnIndex("bucket_display_name");
            int iPath = Build.VERSION.SDK_INT >= 29 ? c.getColumnIndex(MediaStore.MediaColumns.RELATIVE_PATH) : -1;
            while (c.moveToNext()) {
                JSObject o = new JSObject();
                o.put("id", c.getLong(iId));
                o.put("kind", kind);
                o.put("name", iName >= 0 ? c.getString(iName) : "");
                o.put("size", iSize >= 0 ? c.getLong(iSize) : 0);
                long taken = iTaken >= 0 ? c.getLong(iTaken) : 0;
                if (taken <= 0 && iMod >= 0) taken = c.getLong(iMod) * 1000L;
                o.put("taken", taken);
                o.put("mime", iMime >= 0 ? c.getString(iMime) : "");
                o.put("w", iW >= 0 ? c.getInt(iW) : 0);
                o.put("h", iH >= 0 ? c.getInt(iH) : 0);
                o.put("bucket", iBucket >= 0 ? c.getString(iBucket) : "");
                o.put("path", iPath >= 0 ? c.getString(iPath) : "");
                out.put(o);
            }
        } finally {
            c.close();
        }
    }

    @PluginMethod
    public void hashMedia(PluginCall call) {
        final JSArray items = call.getArray("items", new JSArray());
        new Thread(() -> {
            JSObject r = new JSObject();
            ContentResolver cr = getContext().getContentResolver();
            for (int i = 0; i < items.length(); i++) {
                try {
                    JSONObject it = items.getJSONObject(i);
                    InputStream in = cr.openInputStream(itemUri(it));
                    if (in == null) continue;
                    r.put(it.optString("kind") + ":" + it.optLong("id"), sha1(in));
                } catch (Exception ignored) {
                }
            }
            JSObject res = new JSObject();
            res.put("hashes", r);
            call.resolve(res);
        }).start();
    }

    @PluginMethod
    public void thumbs(PluginCall call) {
        final JSArray items = call.getArray("items", new JSArray());
        final int px = call.getInt("size", 160);
        new Thread(() -> {
            JSObject r = new JSObject();
            ContentResolver cr = getContext().getContentResolver();
            for (int i = 0; i < items.length(); i++) {
                try {
                    JSONObject it = items.getJSONObject(i);
                    Bitmap bmp = loadThumb(cr, it, px);
                    if (bmp == null) continue;
                    JSObject o = new JSObject();
                    o.put("dhash", dHash(bmp));
                    o.put("sharp", sharpness(bmp));
                    ByteArrayOutputStream bo = new ByteArrayOutputStream();
                    bmp.compress(Bitmap.CompressFormat.JPEG, 70, bo);
                    o.put("src", "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP));
                    r.put(it.optString("kind") + ":" + it.optLong("id"), o);
                    bmp.recycle();
                } catch (Exception ignored) {
                }
            }
            JSObject res = new JSObject();
            res.put("thumbs", r);
            call.resolve(res);
        }).start();
    }

    /**
     * Große Vorschau in echter Qualität: Das Originalbild wird auf max. "size" Pixel
     * (lange Seite) dekodiert, richtig gedreht und als JPEG im App-Cache abgelegt.
     * Rückgabe: "uri" (file://…) zum Anzeigen; mit inline=true zusätzlich "src" als data-URL.
     */
    @PluginMethod
    public void preview(PluginCall call) {
        final JSObject it = new JSObject();
        final long id = call.getData().optLong("id");
        final String kind = call.getString("kind", "image");
        it.put("id", id);
        it.put("kind", kind);
        final int px = Math.max(512, Math.min(4096, call.getInt("size", 2048)));
        final boolean inline = call.getBoolean("inline", false);
        new Thread(() -> {
            try {
                File dir = new File(getContext().getCacheDir(), "vorschau");
                if (!dir.isDirectory()) dir.mkdirs();
                File f = new File(dir, kind + "_" + id + "_" + px + ".jpg");
                int w = 0, h = 0;
                if (!f.isFile() || f.length() == 0) {
                    Bitmap bmp = decodeLarge(getContext().getContentResolver(), it, px);
                    if (bmp == null) {
                        call.reject("Bild ließ sich nicht öffnen");
                        return;
                    }
                    w = bmp.getWidth();
                    h = bmp.getHeight();
                    FileOutputStream out = new FileOutputStream(f);
                    try {
                        bmp.compress(Bitmap.CompressFormat.JPEG, 90, out);
                    } finally {
                        out.close();
                    }
                    bmp.recycle();
                }
                JSObject r = new JSObject();
                r.put("uri", Uri.fromFile(f).toString());
                r.put("w", w);
                r.put("h", h);
                if (inline) {
                    FileInputStream in = new FileInputStream(f);
                    ByteArrayOutputStream bo = new ByteArrayOutputStream();
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
                    in.close();
                    r.put("src", "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP));
                }
                call.resolve(r);
            } catch (Throwable e) {
                call.reject("Vorschau ging nicht: " + e.getMessage());
            }
        }).start();
    }

    private volatile boolean belegStop = false;

    /**
     * Rechnungen/Briefe in Fotos finden: liest den Text der übergebenen Fotos (ML Kit, im Gerät)
     * und gibt ihn zurück. Bewertet wird in der App. Fortschritt über "belegFortschritt".
     */
    @PluginMethod
    public void belegeSuchen(final PluginCall call) {
        final org.json.JSONArray items = call.getData().optJSONArray("items");
        final int px = Math.max(800, Math.min(2400, call.getInt("size", 1600)));
        if (items == null) { call.reject("Keine Fotos"); return; }
        belegStop = false;
        new Thread(() -> {
            TextRecognizer rec = null;
            try {
                rec = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
                ContentResolver cr = getContext().getContentResolver();
                JSArray out = new JSArray();
                int n = items.length();
                for (int i = 0; i < n && !belegStop; i++) {
                    JSONObject it = items.getJSONObject(i);
                    try {
                        Bitmap bmp = decodeLarge(cr, it, px);
                        if (bmp != null) {
                            Text t = Tasks.await(rec.process(InputImage.fromBitmap(bmp, 0)));
                            bmp.recycle();
                            String s = t.getText();
                            if (s != null && s.length() >= 80) {
                                JSObject o = new JSObject();
                                o.put("id", it.optLong("id"));
                                o.put("text", s.length() > 5000 ? s.substring(0, 5000) : s);
                                out.put(o);
                            }
                        }
                    } catch (Throwable ignored) { }
                    if (i % 3 == 0 || i == n - 1) {
                        JSObject p = new JSObject();
                        p.put("i", i + 1);
                        p.put("n", n);
                        notifyListeners("belegFortschritt", p);
                    }
                }
                JSObject r = new JSObject();
                r.put("items", out);
                r.put("stopped", belegStop);
                call.resolve(r);
            } catch (Throwable e) {
                call.reject("Suche ging nicht: " + e.getMessage());
            } finally {
                try { if (rec != null) rec.close(); } catch (Throwable ignored) { }
            }
        }).start();
    }

    private static final java.util.Set<String> TIERE = new java.util.HashSet<>(java.util.Arrays.asList(
            "Cat", "Dog", "Pet", "Bird", "Horse", "Rabbit", "Hamster", "Turtle", "Fish"));

    /**
     * Ordnung: pro Foto Inhalt (ML Kit Bildlabels, offline), Aufnahmeort (EXIF-GPS, nur gelesen)
     * und bei Tieren ein Farbprofil (zum Auseinanderhalten mehrerer Haustiere).
     * Fortschritt über "ordnenFortschritt". Nichts wird verändert.
     */
    @PluginMethod
    public void ordnenAnalyse(final PluginCall call) {
        final org.json.JSONArray items = call.getData().optJSONArray("items");
        final boolean doLabels = call.getBoolean("labels", true);
        final boolean doGeo = call.getBoolean("geo", true);
        if (items == null) { call.reject("Keine Fotos"); return; }
        belegStop = false;
        new Thread(() -> {
            ImageLabeler lab = null, net = null;
            try {
                if (doLabels) lab = ImageLabeling.getClient(new ImageLabelerOptions.Builder().setConfidenceThreshold(0.5f).build());
                if (doLabels) {
                    try {
                        getContext().getAssets().open("imagenet.tflite").close();
                        LocalModel lm = new LocalModel.Builder().setAssetFilePath("imagenet.tflite").build();
                        net = ImageLabeling.getClient(new CustomImageLabelerOptions.Builder(lm).setConfidenceThreshold(0.08f).setMaxResultCount(6).build());
                    } catch (Throwable ignored) { net = null; }
                }
                ContentResolver cr = getContext().getContentResolver();
                boolean geoOk = doGeo && Build.VERSION.SDK_INT >= 24 && (Build.VERSION.SDK_INT < 29 || getPermissionState("location") == PermissionState.GRANTED);
                JSArray out = new JSArray();
                int n = items.length();
                for (int i = 0; i < n && !belegStop; i++) {
                    JSONObject it = items.getJSONObject(i);
                    JSObject o = new JSObject();
                    o.put("id", it.optLong("id"));
                    if (geoOk) {
                        try {
                            Uri u = itemUri(it);
                            if (Build.VERSION.SDK_INT >= 29) u = MediaStore.setRequireOriginal(u);
                            InputStream in = cr.openInputStream(u);
                            if (in != null) {
                                android.media.ExifInterface ex = new android.media.ExifInterface(in);
                                float[] ll = new float[2];
                                if (ex.getLatLong(ll) && !(ll[0] == 0f && ll[1] == 0f)) {
                                    JSArray g = new JSArray();
                                    g.put(Math.round(ll[0] * 1000) / 1000.0);
                                    g.put(Math.round(ll[1] * 1000) / 1000.0);
                                    o.put("g", g);
                                }
                                in.close();
                            }
                        } catch (Throwable ignored) { }
                    }
                    if (lab != null) {
                        try {
                            Bitmap bmp = loadThumb(cr, it, 384);
                            if (bmp != null) {
                                List<ImageLabel> ls = Tasks.await(lab.process(InputImage.fromBitmap(bmp, 0)));
                                JSArray la = new JSArray();
                                boolean tier = false;
                                for (ImageLabel l : ls) {
                                    JSArray x = new JSArray();
                                    x.put(l.getText());
                                    x.put(Math.round(l.getConfidence() * 100));
                                    la.put(x);
                                    if (TIERE.contains(l.getText())) tier = true;
                                }
                                o.put("l", la);
                                if (net != null) {
                                    List<ImageLabel> ns = Tasks.await(net.process(InputImage.fromBitmap(bmp, 0)));
                                    JSArray na = new JSArray();
                                    for (ImageLabel l : ns) {
                                        JSArray x = new JSArray();
                                        x.put(l.getText());
                                        x.put(Math.round(l.getConfidence() * 100));
                                        na.put(x);
                                    }
                                    o.put("n", na);
                                }
                                o.put("h", farbProfil(bmp));
                                bmp.recycle();
                            }
                        } catch (Throwable ignored) { }
                    }
                    out.put(o);
                    if (i % 10 == 0 || i == n - 1) {
                        JSObject p = new JSObject();
                        p.put("i", i + 1);
                        p.put("n", n);
                        notifyListeners("ordnenFortschritt", p);
                    }
                }
                JSObject r = new JSObject();
                r.put("items", out);
                r.put("geo", geoOk);
                r.put("imagenet", net != null);
                r.put("stopped", belegStop);
                call.resolve(r);
            } catch (Throwable e) {
                call.reject("Analyse ging nicht: " + e.getMessage());
            } finally {
                try { if (lab != null) lab.close(); } catch (Throwable ignored) { }
                try { if (net != null) net.close(); } catch (Throwable ignored) { }
            }
        }).start();
    }

    /** Farbprofil der Bildmitte: 4×4×4 Farbwürfel, Anteile in Promille (64 Zahlen). */
    private static JSArray farbProfil(Bitmap b) {
        int w = b.getWidth(), h = b.getHeight();
        int[] bins = new int[64];
        int n = 0;
        for (int y = h / 5; y < h * 4 / 5; y += 2) {
            for (int x = w / 5; x < w * 4 / 5; x += 2) {
                int c = b.getPixel(x, y);
                int r = (c >> 16) & 255, g = (c >> 8) & 255, bl = c & 255;
                bins[(r >> 6) * 16 + (g >> 6) * 4 + (bl >> 6)]++;
                n++;
            }
        }
        JSArray a = new JSArray();
        for (int v : bins) a.put(n == 0 ? 0 : Math.round(v * 1000f / n));
        return a;
    }

    @PluginMethod
    public void belegeStopp(PluginCall call) {
        belegStop = true;
        call.resolve();
    }

    private Bitmap decodeLarge(ContentResolver cr, JSONObject it, final int max) throws Exception {
        if ("video".equals(it.optString("kind"))) return loadThumb(cr, it, max);
        Uri u = itemUri(it);
        if (Build.VERSION.SDK_INT >= 28) {
            ImageDecoder.Source src = ImageDecoder.createSource(cr, u);
            return ImageDecoder.decodeBitmap(src, (decoder, info, source) -> {
                int w = info.getSize().getWidth(), h = info.getSize().getHeight();
                float sc = Math.min(1f, (float) max / Math.max(w, h));
                decoder.setTargetSize(Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
                decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
            });
        }
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        InputStream in = cr.openInputStream(u);
        if (in == null) return null;
        BitmapFactory.decodeStream(in, null, o);
        in.close();
        int sample = 1;
        while (Math.max(o.outWidth, o.outHeight) / (sample * 2) >= max) sample *= 2;
        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = sample;
        in = cr.openInputStream(u);
        if (in == null) return null;
        Bitmap b = BitmapFactory.decodeStream(in, null, o2);
        in.close();
        return b;
    }

    /** Alte Vorschauen (älter als 1 Tag) aus dem Cache entfernen. */
    private void cleanPreviewCache() {
        File dir = new File(getContext().getCacheDir(), "vorschau");
        File[] list = dir.listFiles();
        if (list == null) return;
        long limit = System.currentTimeMillis() - 24L * 3600 * 1000;
        for (File f : list) if (f.lastModified() < limit) f.delete();
    }

    /** Schärfe-Maß: Varianz des Laplace-Filters auf Graustufen (höher = schärfer). */
    private static double sharpness(Bitmap src) {
        Bitmap b = src;
        int w = b.getWidth(), h = b.getHeight();
        if (w > 320 || h > 320) {
            float sc = 320f / Math.max(w, h);
            b = Bitmap.createScaledBitmap(src, Math.max(3, Math.round(w * sc)), Math.max(3, Math.round(h * sc)), true);
            w = b.getWidth();
            h = b.getHeight();
        }
        int[] px = new int[w * h];
        b.getPixels(px, 0, w, 0, 0, w, h);
        int[] g = new int[w * h];
        for (int i = 0; i < px.length; i++) g[i] = (Color.red(px[i]) * 30 + Color.green(px[i]) * 59 + Color.blue(px[i]) * 11) / 100;
        double sum = 0, sum2 = 0;
        long n = 0;
        for (int y = 1; y < h - 1; y++) {
            for (int x = 1; x < w - 1; x++) {
                int i = y * w + x;
                int lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
                sum += lap;
                sum2 += (double) lap * lap;
                n++;
            }
        }
        if (b != src) b.recycle();
        if (n == 0) return 0;
        double mean = sum / n;
        return Math.round((sum2 / n - mean * mean) * 10) / 10.0;
    }

    @SuppressWarnings("deprecation")
    private Bitmap loadThumb(ContentResolver cr, JSONObject it, int px) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            return cr.loadThumbnail(itemUri(it), new Size(px, px), null);
        }
        long id = it.optLong("id");
        if ("video".equals(it.optString("kind"))) {
            return MediaStore.Video.Thumbnails.getThumbnail(cr, id, MediaStore.Video.Thumbnails.MINI_KIND, null);
        }
        return MediaStore.Images.Thumbnails.getThumbnail(cr, id, MediaStore.Images.Thumbnails.MINI_KIND, null);
    }

    private static String dHash(Bitmap src) {
        Bitmap s = Bitmap.createScaledBitmap(src, 9, 8, true);
        long h = 0;
        for (int y = 0; y < 8; y++) {
            for (int x = 0; x < 8; x++) {
                int a = s.getPixel(x, y), b = s.getPixel(x + 1, y);
                int ga = Color.red(a) * 30 + Color.green(a) * 59 + Color.blue(a) * 11;
                int gb = Color.red(b) * 30 + Color.green(b) * 59 + Color.blue(b) * 11;
                h = (h << 1) | (ga > gb ? 1 : 0);
            }
        }
        if (s != src) s.recycle();
        return String.format("%016x", h);
    }

    private List<Uri> uris(JSArray items) throws Exception {
        List<Uri> list = new ArrayList<>();
        for (int i = 0; i < items.length(); i++) list.add(itemUri(items.getJSONObject(i)));
        return list;
    }

    /** In den Android-Papierkorb (30 Tage) oder zurückholen. Android zeigt vorher einen eigenen Bestätigungsdialog. */
    @PluginMethod
    public void trashMedia(PluginCall call) {
        if (Build.VERSION.SDK_INT < 30) {
            call.reject("Dafür ist Android 11 oder neuer nötig.");
            return;
        }
        try {
            boolean restore = call.getBoolean("restore", false);
            PendingIntent pi = MediaStore.createTrashRequest(getContext().getContentResolver(), uris(call.getArray("items", new JSArray())), !restore);
            launch(call, pi, null);
        } catch (Exception e) {
            call.reject("Ging nicht: " + e.getMessage());
        }
    }

    /** Endgültig löschen (nur aus dem Papierkorb heraus genutzt). Android fragt vorher selbst nach. */
    @PluginMethod
    public void deleteMedia(PluginCall call) {
        if (Build.VERSION.SDK_INT < 30) {
            call.reject("Dafür ist Android 11 oder neuer nötig.");
            return;
        }
        try {
            PendingIntent pi = MediaStore.createDeleteRequest(getContext().getContentResolver(), uris(call.getArray("items", new JSArray())));
            launch(call, pi, null);
        } catch (Exception e) {
            call.reject("Ging nicht: " + e.getMessage());
        }
    }

    /** Fotos/Videos in Ordner (Alben) verschieben, z. B. "Pictures/Hochzeit Lisa". Jedes Element kann einen eigenen Zielpfad haben; Android fragt einmal für alle. */
    @PluginMethod
    public void moveMedia(PluginCall call) {
        if (Build.VERSION.SDK_INT < 30) {
            call.reject("Dafür ist Android 11 oder neuer nötig.");
            return;
        }
        final String fallback = call.getString("path", "");
        try {
            final JSArray items = call.getArray("items", new JSArray());
            final List<Uri> list = new ArrayList<>();
            final List<String> targets = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.getJSONObject(i);
                String t = it.optString("path", fallback).replaceAll("^/+|/+$", "");
                if (t.length() < 3 || t.contains("..")) continue;
                list.add(itemUri(it));
                targets.add(t + "/");
            }
            if (list.isEmpty()) {
                call.reject("Kein gültiger Zielordner angegeben.");
                return;
            }
            final ContentResolver cr = getContext().getContentResolver();
            PendingIntent pi = MediaStore.createWriteRequest(cr, list);
            launch(call, pi, () -> {
                int ok = 0, fail = 0;
                for (int k = 0; k < list.size(); k++) {
                    Uri u = list.get(k);
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, targets.get(k));
                        if (cr.update(u, cv, null, null) > 0) ok++;
                        else fail++;
                    } catch (Exception e) {
                        fail++;
                    }
                }
                JSObject r = new JSObject();
                r.put("ok", true);
                r.put("moved", ok);
                r.put("failed", fail);
                call.resolve(r);
            });
        } catch (Exception e) {
            call.reject("Ging nicht: " + e.getMessage());
        }
    }

    private void launch(PluginCall call, PendingIntent pi, Runnable next) {
        if (pendingCall != null) {
            call.reject("Es läuft schon eine Anfrage.");
            return;
        }
        pendingCall = call;
        afterGrant = next;
        IntentSenderRequest req = new IntentSenderRequest.Builder(pi.getIntentSender()).build();
        getActivity().runOnUiThread(() -> senderLauncher.launch(req));
    }

    // ---------- Dateien (Zugriff auf alle Dateien) ----------

    private File root() {
        return Environment.getExternalStorageDirectory();
    }

    private boolean filesOk(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 30 && Environment.isExternalStorageManager()) return true;
        call.reject("Zugriff auf alle Dateien ist nicht erlaubt.");
        return false;
    }

    @PluginMethod
    public void scanFiles(PluginCall call) {
        if (!filesOk(call)) return;
        final JSArray dirs = call.getArray("dirs", new JSArray());
        final int maxDepth = call.getInt("depth", 4);
        new Thread(() -> {
            JSArray out = new JSArray();
            int[] count = { 0 };
            for (int i = 0; i < dirs.length(); i++) {
                String d = dirs.optString(i);
                File f = new File(root(), d);
                if (f.isDirectory()) walk(f, 0, maxDepth, out, count);
            }
            JSObject r = new JSObject();
            r.put("items", out);
            r.put("root", root().getAbsolutePath());
            call.resolve(r);
        }).start();
    }

    private void walk(File dir, int depth, int maxDepth, JSArray out, int[] count) {
        File[] list = dir.listFiles();
        if (list == null) return;
        for (File f : list) {
            if (count[0] >= 8000) return;
            String n = f.getName();
            if (n.startsWith(".")) continue;
            if (f.isDirectory()) {
                if (depth < maxDepth && !n.equals("Kleinkram-Papierkorb")) walk(f, depth + 1, maxDepth, out, count);
                continue;
            }
            JSObject o = new JSObject();
            o.put("path", rel(f));
            o.put("name", n);
            o.put("size", f.length());
            o.put("mod", f.lastModified());
            out.put(o);
            count[0]++;
        }
    }

    private String rel(File f) {
        String r = root().getAbsolutePath();
        String p = f.getAbsolutePath();
        return p.startsWith(r + "/") ? p.substring(r.length() + 1) : p;
    }

    private File safe(String rel) throws Exception {
        File f = new File(root(), rel).getCanonicalFile();
        String r = root().getCanonicalPath();
        if (!f.getPath().startsWith(r + "/")) throw new Exception("Pfad außerhalb des Speichers");
        return f;
    }

    @PluginMethod
    public void hashFiles(PluginCall call) {
        if (!filesOk(call)) return;
        final JSArray paths = call.getArray("paths", new JSArray());
        new Thread(() -> {
            JSObject r = new JSObject();
            for (int i = 0; i < paths.length(); i++) {
                try {
                    String p = paths.getString(i);
                    r.put(p, sha1(new FileInputStream(safe(p))));
                } catch (Exception ignored) {
                }
            }
            JSObject res = new JSObject();
            res.put("hashes", r);
            call.resolve(res);
        }).start();
    }

    /** Verschiebt Dateien in einen Ordner. Gibt für jede Datei den neuen Pfad zurück (für Rückgängig). */
    @PluginMethod
    public void moveFiles(PluginCall call) {
        if (!filesOk(call)) return;
        final JSArray paths = call.getArray("paths", new JSArray());
        final String target = call.getString("target", "");
        final boolean keepTree = call.getBoolean("keepTree", false);
        new Thread(() -> {
            JSArray moved = new JSArray();
            List<String> scan = new ArrayList<>();
            int fail = 0;
            for (int i = 0; i < paths.length(); i++) {
                try {
                    String p = paths.getString(i);
                    File src = safe(p);
                    String sub = keepTree && src.getParentFile() != null ? rel(src.getParentFile()) : "";
                    File dir = safe(sub.isEmpty() ? target : target + "/" + sub);
                    if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("Ordner nicht anlegbar");
                    File dst = free(new File(dir, src.getName()));
                    if (!src.renameTo(dst)) throw new Exception("Verschieben ging nicht");
                    JSObject o = new JSObject();
                    o.put("from", p);
                    o.put("to", rel(dst));
                    moved.put(o);
                    scan.add(src.getAbsolutePath());
                    scan.add(dst.getAbsolutePath());
                } catch (Exception e) {
                    fail++;
                }
            }
            if (!scan.isEmpty()) MediaScannerConnection.scanFile(getContext(), scan.toArray(new String[0]), null, null);
            JSObject r = new JSObject();
            r.put("moved", moved);
            r.put("failed", fail);
            call.resolve(r);
        }).start();
    }

    /** Einzelne Dateien an genau angegebene Pfade zurücklegen (Wiederherstellen aus dem Papierkorb). */
    @PluginMethod
    public void restoreFiles(PluginCall call) {
        if (!filesOk(call)) return;
        final JSArray pairs = call.getArray("pairs", new JSArray());
        new Thread(() -> {
            JSArray done = new JSArray();
            List<String> scan = new ArrayList<>();
            for (int i = 0; i < pairs.length(); i++) {
                try {
                    JSONObject pr = pairs.getJSONObject(i);
                    File src = safe(pr.getString("now"));
                    File dst = safe(pr.getString("orig"));
                    File dir = dst.getParentFile();
                    if (dir != null && !dir.isDirectory()) dir.mkdirs();
                    dst = free(dst);
                    if (src.renameTo(dst)) {
                        JSObject o = new JSObject();
                        o.put("now", pr.getString("now"));
                        o.put("to", rel(dst));
                        done.put(o);
                        scan.add(src.getAbsolutePath());
                        scan.add(dst.getAbsolutePath());
                    }
                } catch (Exception ignored) {
                }
            }
            if (!scan.isEmpty()) MediaScannerConnection.scanFile(getContext(), scan.toArray(new String[0]), null, null);
            JSObject r = new JSObject();
            r.put("done", done);
            call.resolve(r);
        }).start();
    }

    /** Endgültig löschen – nur für Dateien im Kleinkram-Papierkorb erlaubt. */
    @PluginMethod
    public void deleteFiles(PluginCall call) {
        if (!filesOk(call)) return;
        final JSArray paths = call.getArray("paths", new JSArray());
        new Thread(() -> {
            int ok = 0;
            long bytes = 0;
            List<String> scan = new ArrayList<>();
            for (int i = 0; i < paths.length(); i++) {
                try {
                    String p = paths.getString(i);
                    if (!p.startsWith("Kleinkram-Papierkorb/")) continue;
                    File f = safe(p);
                    long len = f.length();
                    if (f.isFile() && f.delete()) {
                        ok++;
                        bytes += len;
                        scan.add(f.getAbsolutePath());
                    }
                } catch (Exception ignored) {
                }
            }
            if (!scan.isEmpty()) MediaScannerConnection.scanFile(getContext(), scan.toArray(new String[0]), null, null);
            JSObject r = new JSObject();
            r.put("deleted", ok);
            r.put("bytes", bytes);
            call.resolve(r);
        }).start();
    }

    private static File free(File f) {
        if (!f.exists()) return f;
        String n = f.getName();
        int dot = n.lastIndexOf('.');
        String base = dot > 0 ? n.substring(0, dot) : n;
        String ext = dot > 0 ? n.substring(dot) : "";
        for (int i = 2; i < 1000; i++) {
            File g = new File(f.getParentFile(), base + " (" + i + ")" + ext);
            if (!g.exists()) return g;
        }
        return new File(f.getParentFile(), base + " " + System.currentTimeMillis() + ext);
    }

    private static String sha1(InputStream in) throws Exception {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
            byte[] d = md.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } finally {
            in.close();
        }
    }
}
