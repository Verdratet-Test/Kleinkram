package de.kleinkram.app;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;

import org.opencv.android.OpenCVLoader;
import org.opencv.android.Utils;
import org.opencv.calib3d.Calib3d;
import org.opencv.core.Core;
import org.opencv.core.DMatch;
import org.opencv.core.KeyPoint;
import org.opencv.core.Mat;
import org.opencv.core.MatOfDMatch;
import org.opencv.core.MatOfInt;
import org.opencv.core.MatOfKeyPoint;
import org.opencv.core.MatOfPoint;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.Point;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.features2d.BFMatcher;
import org.opencv.features2d.SIFT;
import org.opencv.imgproc.CLAHE;
import org.opencv.imgproc.Imgproc;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Scannen und Wiedererkennen – alles im Gerät, kein Bild verlässt das Handy.
 *
 * scannen({seiten})            → Googles Dokumentenscanner (Kanten finden, zuschneiden, entzerren) → {bilder:[base64-JPEG]}
 * codes({image})               → QR-Codes im Bild (ML Kit) → {codes:[Text]}
 * begradigen({image})          → Blatt im Foto finden und gerade ziehen (OpenCV) → {gefunden, image}
 * ortPruefen({image,refs,key}) → Ist das dieselbe Stelle wie auf den Vergleichsfotos? (OpenCV: markante Punkte
 *                                + geometrische Probe) → {ok, h, f, gut, punkte, refPunkte}
 */
@CapacitorPlugin(name = "Scan")
public class ScanPlugin extends Plugin {

    private ActivityResultLauncher<IntentSenderRequest> scanLauncher;
    private PluginCall scanCall;
    private static boolean cvOk = false, cvTried = false;

    @Override
    public void load() {
        scanLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(), this::onScanResult);
    }

    private static synchronized boolean cv() {
        if (!cvTried) {
            cvTried = true;
            try { cvOk = OpenCVLoader.initLocal(); } catch (Throwable t) { cvOk = false; }
        }
        return cvOk;
    }

    // ---------- Hilfen ----------

    private static Bitmap decode(String b64, int maxSide) {
        if (b64 == null || b64.isEmpty()) return null;
        int comma = b64.indexOf(',');
        if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
        try {
            byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, o);
            int s = 1;
            while (maxSide > 0 && Math.max(o.outWidth, o.outHeight) / (s * 2) >= maxSide) s *= 2;
            o = new BitmapFactory.Options();
            o.inSampleSize = s;
            o.inPreferredConfig = Bitmap.Config.ARGB_8888;
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, o);
        } catch (Throwable t) { return null; }
    }

    private static String encode(Bitmap bmp, int quality) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.JPEG, quality, out);
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

    private static Bitmap fit(Bitmap bmp, int maxSide) {
        int w = bmp.getWidth(), h = bmp.getHeight();
        if (Math.max(w, h) <= maxSide) return bmp;
        double k = maxSide / (double) Math.max(w, h);
        return Bitmap.createScaledBitmap(bmp, Math.max(1, (int) Math.round(w * k)), Math.max(1, (int) Math.round(h * k)), true);
    }

    // ---------- Dokumentenscanner ----------

    @PluginMethod
    public void scannen(PluginCall call) {
        if (scanCall != null) { call.reject("Es läuft schon ein Scan."); return; }
        int seiten = Math.max(1, Math.min(5, call.getInt("seiten", 1)));
        try {
            GmsDocumentScannerOptions opt = new GmsDocumentScannerOptions.Builder()
                .setGalleryImportAllowed(false)
                .setPageLimit(seiten)
                .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
                .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
                .build();
            scanCall = call;
            GmsDocumentScanning.getClient(opt).getStartScanIntent(getActivity())
                .addOnSuccessListener(sender -> {
                    try {
                        scanLauncher.launch(new IntentSenderRequest.Builder(sender).build());
                    } catch (Throwable t) {
                        scanCall = null;
                        call.reject("Scanner ließ sich nicht öffnen: " + t.getMessage(), "nicht_verfuegbar");
                    }
                })
                .addOnFailureListener(e -> {
                    scanCall = null;
                    call.reject("Scanner nicht verfügbar: " + e.getMessage(), "nicht_verfuegbar");
                });
        } catch (Throwable t) {
            scanCall = null;
            call.reject("Scanner nicht verfügbar: " + t.getMessage(), "nicht_verfuegbar");
        }
    }

    private void onScanResult(ActivityResult result) {
        final PluginCall call = scanCall;
        scanCall = null;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject r = new JSObject();
            r.put("abgebrochen", true);
            r.put("bilder", new JSArray());
            call.resolve(r);
            return;
        }
        final GmsDocumentScanningResult res = GmsDocumentScanningResult.fromActivityResultIntent(result.getData());
        new Thread(() -> {
            try {
                JSArray bilder = new JSArray();
                if (res != null && res.getPages() != null) {
                    for (GmsDocumentScanningResult.Page p : res.getPages()) {
                        Uri u = p.getImageUri();
                        Bitmap bmp = null;
                        try (InputStream in = getContext().getContentResolver().openInputStream(u)) {
                            BitmapFactory.Options o = new BitmapFactory.Options();
                            o.inPreferredConfig = Bitmap.Config.ARGB_8888;
                            bmp = BitmapFactory.decodeStream(in, null, o);
                        }
                        if (bmp == null) continue;
                        bilder.put(encode(fit(bmp, 2600), 90));
                        try { if ("file".equals(u.getScheme()) && u.getPath() != null) new File(u.getPath()).delete(); } catch (Throwable ignored) { }
                    }
                }
                JSObject r = new JSObject();
                r.put("bilder", bilder);
                call.resolve(r);
            } catch (Throwable t) {
                call.reject("Scan ließ sich nicht lesen: " + t.getMessage());
            }
        }).start();
    }

    // ---------- QR-Codes ----------

    private BarcodeScanner qr;

    @PluginMethod
    public void codes(PluginCall call) {
        final Bitmap bmp = decode(call.getString("image"), 0);
        if (bmp == null) { call.reject("Bild nicht lesbar"); return; }
        new Thread(() -> {
            try {
                if (qr == null) qr = BarcodeScanning.getClient(new BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build());
                JSArray out = new JSArray();
                for (Barcode b : Tasks.await(qr.process(InputImage.fromBitmap(bmp, 0)))) {
                    if (b.getRawValue() != null) out.put(b.getRawValue());
                }
                JSObject r = new JSObject();
                r.put("codes", out);
                call.resolve(r);
            } catch (Throwable t) {
                call.reject("Code-Suche ging nicht: " + t.getMessage());
            }
        }).start();
    }

    // ---------- Blatt gerade ziehen (OpenCV) ----------

    /** Ecken sortieren: oben links, oben rechts, unten rechts, unten links. */
    private static Point[] order(Point[] p) {
        Point tl = p[0], br = p[0], tr = p[0], bl = p[0];
        for (Point q : p) {
            if (q.x + q.y < tl.x + tl.y) tl = q;
            if (q.x + q.y > br.x + br.y) br = q;
            if (q.x - q.y > tr.x - tr.y) tr = q;
            if (q.x - q.y < bl.x - bl.y) bl = q;
        }
        return new Point[] { tl, tr, br, bl };
    }

    private static double dist(Point a, Point b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    /** Fläche des Vierecks, wenn es wie ein Blatt aussieht (groß genug, gewölbt, Winkel um 90°) – sonst 0. */
    private static double quadOk(Point[] q, double W, double H) {
        double a = Math.abs(Imgproc.contourArea(new MatOfPoint2f(q)));
        if (a < 0.22 * W * H) return 0;
        if (!Imgproc.isContourConvex(new MatOfPoint(q))) return 0;
        for (int i = 0; i < 4; i++) {
            Point c = q[i], p = q[(i + 3) % 4], n = q[(i + 1) % 4];
            double v1x = p.x - c.x, v1y = p.y - c.y, v2x = n.x - c.x, v2y = n.y - c.y;
            double cos = (v1x * v2x + v1y * v2y) / (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) + 1e-6);
            if (Math.abs(cos) > 0.57) return 0;
        }
        return a;
    }

    /** Sucht das Blatt im (verkleinerten) Bild; Ecken in Koordinaten des Originalbilds oder null. */
    private static Point[] findQuad(Mat rgba) {
        double k = 640.0 / Math.max(rgba.cols(), rgba.rows());
        Mat sm = new Mat();
        Imgproc.resize(rgba, sm, new Size(Math.round(rgba.cols() * k), Math.round(rgba.rows() * k)), 0, 0, Imgproc.INTER_AREA);
        double W = sm.cols(), H = sm.rows();
        Mat g = new Mat();
        Imgproc.cvtColor(sm, g, Imgproc.COLOR_RGBA2GRAY);
        Imgproc.GaussianBlur(g, g, new Size(5, 5), 0);
        List<Mat> masks = new ArrayList<>();
        Mat e = new Mat();
        Imgproc.Canny(g, e, 40, 120);
        Imgproc.dilate(e, e, Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(3, 3)), new Point(-1, -1), 2);
        masks.add(e);
        Mat big = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(15, 15));
        Mat t = new Mat();
        Imgproc.threshold(g, t, 0, 255, Imgproc.THRESH_BINARY + Imgproc.THRESH_OTSU);
        Imgproc.morphologyEx(t, t, Imgproc.MORPH_CLOSE, big);
        masks.add(t);
        Mat rgb = new Mat(), hsv = new Mat();
        Imgproc.cvtColor(sm, rgb, Imgproc.COLOR_RGBA2RGB);
        Imgproc.cvtColor(rgb, hsv, Imgproc.COLOR_RGB2HSV);
        List<Mat> ch = new ArrayList<>();
        Core.split(hsv, ch);
        Mat s = ch.get(1), t2 = new Mat();
        Imgproc.GaussianBlur(s, s, new Size(5, 5), 0);
        Imgproc.threshold(s, t2, 0, 255, Imgproc.THRESH_BINARY_INV + Imgproc.THRESH_OTSU);
        Imgproc.morphologyEx(t2, t2, Imgproc.MORPH_CLOSE, big);
        masks.add(t2);

        double best = 0;
        Point[] bestQ = null;
        for (Mat mk : masks) {
            List<MatOfPoint> cs = new ArrayList<>();
            Imgproc.findContours(mk, cs, new Mat(), Imgproc.RETR_LIST, Imgproc.CHAIN_APPROX_SIMPLE);
            Collections.sort(cs, (x, y) -> Double.compare(Imgproc.contourArea(y), Imgproc.contourArea(x)));
            for (int i = 0; i < cs.size() && i < 6; i++) {
                MatOfPoint c = cs.get(i);
                if (Imgproc.contourArea(c) < 0.2 * W * H) break;
                MatOfInt hi = new MatOfInt();
                Imgproc.convexHull(c, hi);
                Point[] cp = c.toArray();
                int[] idx = hi.toArray();
                Point[] hp = new Point[idx.length];
                for (int j = 0; j < idx.length; j++) hp[j] = cp[idx[j]];
                MatOfPoint2f hull = new MatOfPoint2f(hp);
                double per = Imgproc.arcLength(hull, true);
                for (double eps : new double[] { 0.02, 0.035, 0.05 }) {
                    MatOfPoint2f ap = new MatOfPoint2f();
                    Imgproc.approxPolyDP(hull, ap, eps * per, true);
                    Point[] q = ap.toArray();
                    if (q.length == 4) {
                        q = order(q);
                        double a = quadOk(q, W, H);
                        if (a > best) { best = a; bestQ = q; }
                        break;
                    }
                }
            }
        }
        if (bestQ == null) return null;
        Point[] out = new Point[4];
        for (int i = 0; i < 4; i++) out[i] = new Point(bestQ[i].x / k, bestQ[i].y / k);
        return out;
    }

    @PluginMethod
    public void begradigen(PluginCall call) {
        final Bitmap bmp = decode(call.getString("image"), 3200);
        if (bmp == null) { call.reject("Bild nicht lesbar"); return; }
        new Thread(() -> {
            JSObject r = new JSObject();
            try {
                if (!cv()) { r.put("gefunden", false); call.resolve(r); return; }
                Mat src = new Mat();
                Utils.bitmapToMat(bmp, src);
                Point[] q = findQuad(src);
                int W = src.cols(), H = src.rows();
                double m = 0.035 * Math.max(W, H);
                boolean voll = q != null;
                if (q != null) for (Point p : q) if (!(Math.min(p.x, W - p.x) < m && Math.min(p.y, H - p.y) < m)) voll = false;
                if (q == null || voll) { r.put("gefunden", false); call.resolve(r); return; }
                double w = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), h = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
                double sc = Math.min(1, 2600.0 / Math.max(w, h));
                int ow = Math.max(1, (int) Math.round(w * sc)), oh = Math.max(1, (int) Math.round(h * sc));
                Mat M = Imgproc.getPerspectiveTransform(new MatOfPoint2f(q),
                    new MatOfPoint2f(new Point(0, 0), new Point(ow, 0), new Point(ow, oh), new Point(0, oh)));
                Mat dst = new Mat();
                Imgproc.warpPerspective(src, dst, M, new Size(ow, oh), Imgproc.INTER_CUBIC, Core.BORDER_REPLICATE, new Scalar(0));
                Bitmap out = Bitmap.createBitmap(ow, oh, Bitmap.Config.ARGB_8888);
                Utils.matToBitmap(dst, out);
                r.put("gefunden", true);
                r.put("image", encode(out, 90));
                call.resolve(r);
            } catch (Throwable t) {
                r.put("gefunden", false);
                call.resolve(r);
            }
        }).start();
    }

    // ---------- Ort wiedererkennen (OpenCV: markante Punkte + geometrische Probe) ----------

    private static class Feat { MatOfKeyPoint kp = new MatOfKeyPoint(); Mat des = new Mat(); int n = 0; }

    private SIFT sift;
    private CLAHE clahe;
    private BFMatcher matcher;
    private String refKey = null;
    private final List<Feat> refFeat = new ArrayList<>();

    /** Graubild, Helligkeit auf den vollen Bereich gestreckt (dunkles Zimmer!), lokaler Kontrast angehoben. */
    private Feat features(Bitmap bmp) {
        Bitmap b = fit(bmp, 640);
        Mat rgba = new Mat(), g = new Mat();
        Utils.bitmapToMat(b, rgba);
        Imgproc.cvtColor(rgba, g, Imgproc.COLOR_RGBA2GRAY);
        int n = g.rows() * g.cols();
        byte[] px = new byte[n];
        g.get(0, 0, px);
        int[] hist = new int[256];
        for (byte v : px) hist[v & 255]++;
        int lo = 0, hi = 255, acc = 0;
        for (int i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.01) { lo = i; break; } }
        acc = 0;
        for (int i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.01) { hi = i; break; } }
        if (hi - lo < 160) {
            double a = 255.0 / Math.max(8, hi - lo);
            g.convertTo(g, -1, a, -lo * a);
            if (hi - lo < 90) Imgproc.GaussianBlur(g, g, new Size(0, 0), 0.8);
        }
        if (clahe == null) clahe = Imgproc.createCLAHE(3.0, new Size(8, 8));
        Mat eq = new Mat();
        clahe.apply(g, eq);
        if (sift == null) sift = SIFT.create(900, 3, 0.03, 10, 1.6);
        Feat f = new Feat();
        sift.detectAndCompute(eq, new Mat(), f.kp, f.des);
        f.n = f.des.rows();
        return f;
    }

    /** Vergleich Bild → Vergleichsfoto: {gute Paare, passend bei ebener Probe, passend bei räumlicher Probe, ebene Probe plausibel(1/0)} */
    private int[] match(Feat a, Feat b) {
        int[] res = new int[] { 0, 0, 0, 0 };
        if (a.n < 8 || b.n < 8) return res;
        if (matcher == null) matcher = BFMatcher.create(Core.NORM_L2, false);
        List<MatOfDMatch> knn = new ArrayList<>();
        matcher.knnMatch(a.des, b.des, knn, 2);
        Map<Integer, DMatch> best = new HashMap<>();
        for (MatOfDMatch mm : knn) {
            DMatch[] d = mm.toArray();
            if (d.length < 2 || !(d[0].distance < 0.75f * d[1].distance)) continue;
            DMatch old = best.get(d[0].trainIdx);
            if (old == null || d[0].distance < old.distance) best.put(d[0].trainIdx, d[0]);
        }
        res[0] = best.size();
        if (best.size() < 8) return res;
        KeyPoint[] ka = a.kp.toArray(), kb = b.kp.toArray();
        Point[] pa = new Point[best.size()], pb = new Point[best.size()];
        int i = 0;
        for (DMatch d : best.values()) { pa[i] = ka[d.queryIdx].pt; pb[i] = kb[d.trainIdx].pt; i++; }
        MatOfPoint2f ma = new MatOfPoint2f(pa), mb = new MatOfPoint2f(pb);
        try {
            Mat mask = new Mat();
            Mat Hm = Calib3d.findHomography(ma, mb, Calib3d.RANSAC, 6.0, mask);
            if (Hm != null && !Hm.empty()) {
                res[1] = Core.countNonZero(mask);
                double det = Hm.get(0, 0)[0] * Hm.get(1, 1)[0] - Hm.get(0, 1)[0] * Hm.get(1, 0)[0];
                boolean sane = det > 0.08 && det < 12 && Math.abs(Hm.get(2, 0)[0]) < 0.004 && Math.abs(Hm.get(2, 1)[0]) < 0.004;
                res[3] = sane ? 1 : 0;
            }
        } catch (Throwable ignored) { }
        try {
            Mat mask = new Mat();
            Mat F = Calib3d.findFundamentalMat(ma, mb, Calib3d.FM_RANSAC, 2.0, 0.99, mask);
            if (F != null && !F.empty() && !mask.empty()) res[2] = Core.countNonZero(mask);
        } catch (Throwable ignored) { }
        return res;
    }

    @PluginMethod
    public void ortPruefen(PluginCall call) {
        final Bitmap bmp = decode(call.getString("image"), 1300);
        final JSArray refs = call.getArray("refs");
        final String key = call.getString("key", "");
        if (bmp == null) { call.reject("Bild nicht lesbar"); return; }
        new Thread(() -> {
            synchronized (refFeat) {
                try {
                    if (!cv()) { call.reject("OpenCV ließ sich nicht laden", "nicht_verfuegbar"); return; }
                    if (refs != null && (refKey == null || key.isEmpty() || !refKey.equals(key))) {
                        refFeat.clear();
                        for (int i = 0; i < refs.length(); i++) {
                            Bitmap rb = decode(refs.optString(i, ""), 1300);
                            if (rb != null) refFeat.add(features(rb));
                        }
                        refKey = key.isEmpty() ? null : key;
                    }
                    Feat f = features(bmp);
                    int h = 0, fm = 0, gut = 0, refPunkte = 0;
                    boolean ok = false;
                    for (Feat r : refFeat) {
                        int[] m = match(f, r);
                        boolean hit = (m[1] >= 16 && m[3] == 1) || (m[2] >= 28 && m[0] >= 32);
                        if (hit) ok = true;
                        if (m[3] == 1 || m[1] < 16) h = Math.max(h, m[1]);
                        fm = Math.max(fm, m[2]);
                        gut = Math.max(gut, m[0]);
                        refPunkte = Math.max(refPunkte, r.n);
                    }
                    JSObject r = new JSObject();
                    r.put("ok", ok);
                    r.put("h", h);
                    r.put("f", fm);
                    r.put("gut", gut);
                    r.put("punkte", f.n);
                    r.put("refPunkte", refPunkte);
                    call.resolve(r);
                } catch (Throwable t) {
                    call.reject("Vergleich ging nicht: " + t.getMessage());
                }
            }
        }).start();
    }
}
