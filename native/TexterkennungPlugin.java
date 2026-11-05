package de.kleinkram.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Point;
import android.graphics.Rect;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import com.google.mlkit.vision.label.ImageLabel;
import com.google.mlkit.vision.label.ImageLabeler;
import com.google.mlkit.vision.label.ImageLabeling;
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions;
import com.google.mlkit.common.model.LocalModel;
import com.google.mlkit.vision.label.custom.CustomImageLabelerOptions;

/**
 * Texterkennung direkt auf dem Handy (Google ML Kit, Modell ist in der App enthalten,
 * kein Internet, keine Daten verlassen das Gerät).
 *
 * erkennen({image: base64-JPEG}) → {text, width, height, lines:[{text, x, y, w, h, pts:[8 Zahlen], block}]}
 * Die Koordinaten beziehen sich auf das übergebene Bild.
 */
@CapacitorPlugin(name = "Texterkennung")
public class TexterkennungPlugin extends Plugin {

    private TextRecognizer recognizer;

    private TextRecognizer rec() {
        if (recognizer == null) recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        return recognizer;
    }

    @PluginMethod
    public void erkennen(PluginCall call) {
        String b64 = call.getString("image");
        if (b64 == null || b64.isEmpty()) { call.reject("Kein Bild"); return; }
        int comma = b64.indexOf(',');
        if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
        final Bitmap bmp;
        try {
            byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
            bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Throwable t) { call.reject("Bild nicht lesbar: " + t.getMessage()); return; }
        if (bmp == null) { call.reject("Bild nicht lesbar"); return; }

        InputImage img = InputImage.fromBitmap(bmp, 0);
        rec().process(img)
            .addOnSuccessListener(result -> {
                JSArray lines = new JSArray();
                int bi = 0;
                for (Text.TextBlock block : result.getTextBlocks()) {
                    for (Text.Line line : block.getLines()) {
                        Rect r = line.getBoundingBox();
                        if (r == null) continue;
                        JSObject o = new JSObject();
                        o.put("text", line.getText());
                        o.put("x", r.left); o.put("y", r.top); o.put("w", r.width()); o.put("h", r.height());
                        o.put("block", bi);
                        Point[] cp = line.getCornerPoints();
                        if (cp != null && cp.length == 4) {
                            JSArray p = new JSArray();
                            for (Point q : cp) { p.put(q.x); p.put(q.y); }
                            o.put("pts", p);
                        }
                        lines.put(o);
                    }
                    bi++;
                }
                JSObject ret = new JSObject();
                ret.put("text", result.getText());
                ret.put("width", bmp.getWidth());
                ret.put("height", bmp.getHeight());
                ret.put("lines", lines);
                call.resolve(ret);
            })
            .addOnFailureListener(e -> call.reject("Texterkennung fehlgeschlagen: " + e.getMessage()));
    }

    private ImageLabeler basis, netz;

    /** Wecker „Foto von einem Ort“: Bildinhalt als Merkmale (ImageNet-Klassen + Grundlabels), alles im Gerät. */
    @PluginMethod
    public void bildMerkmal(PluginCall call) {
        String b64 = call.getString("image");
        if (b64 == null || b64.isEmpty()) { call.reject("Kein Bild"); return; }
        int comma = b64.indexOf(',');
        if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
        final Bitmap bmp;
        try {
            byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
            bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Throwable t) { call.reject("Bild nicht lesbar"); return; }
        if (bmp == null) { call.reject("Bild nicht lesbar"); return; }
        new Thread(() -> {
            try {
                if (basis == null) basis = ImageLabeling.getClient(new ImageLabelerOptions.Builder().setConfidenceThreshold(0.3f).build());
                if (netz == null) {
                    try {
                        getContext().getAssets().open("imagenet.tflite").close();
                        netz = ImageLabeling.getClient(new CustomImageLabelerOptions.Builder(new LocalModel.Builder().setAssetFilePath("imagenet.tflite").build())
                                .setConfidenceThreshold(0.005f).setMaxResultCount(40).build());
                    } catch (Throwable ignored) { }
                }
                InputImage im = InputImage.fromBitmap(bmp, 0);
                JSArray l = new JSArray(), n = new JSArray();
                for (ImageLabel x : com.google.android.gms.tasks.Tasks.await(basis.process(im))) { JSArray a = new JSArray(); a.put(x.getText()); a.put(Math.round(x.getConfidence() * 1000) / 10.0); l.put(a); }
                if (netz != null) for (ImageLabel x : com.google.android.gms.tasks.Tasks.await(netz.process(im))) { JSArray a = new JSArray(); a.put(x.getText()); a.put(Math.round(x.getConfidence() * 1000) / 10.0); n.put(a); }
                JSObject r = new JSObject();
                r.put("l", l);
                r.put("n", n);
                call.resolve(r);
            } catch (Throwable e) {
                call.reject("Bild ging nicht: " + e.getMessage());
            }
        }).start();
    }
}
