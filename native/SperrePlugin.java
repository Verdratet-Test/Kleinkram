package de.kleinkram.app;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * App-Sperre: Fingerabdruck/Gesicht oder – als Ausweichweg – die PIN/das Muster des Handys.
 * Es wird nichts gespeichert; Android prüft und meldet nur „ok“ oder „nicht ok“.
 */
@CapacitorPlugin(name = "Sperre")
public class SperrePlugin extends Plugin {

    private static final int AUTH = BiometricManager.Authenticators.BIOMETRIC_WEAK
            | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void status(PluginCall call) {
        BiometricManager bm = BiometricManager.from(getContext());
        int r = bm.canAuthenticate(AUTH);
        JSObject o = new JSObject();
        o.put("ok", r == BiometricManager.BIOMETRIC_SUCCESS);
        o.put("code", r);
        o.put("finger", bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(o);
    }

    @PluginMethod
    public void pruefen(final PluginCall call) {
        final String titel = call.getString("titel", "Kleinkram entsperren");
        getActivity().runOnUiThread(() -> {
            try {
                BiometricPrompt bp = new BiometricPrompt((FragmentActivity) getActivity(),
                        ContextCompat.getMainExecutor(getContext()),
                        new BiometricPrompt.AuthenticationCallback() {
                            private boolean done = false;

                            @Override
                            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                                if (done) return;
                                done = true;
                                JSObject o = new JSObject();
                                o.put("ok", true);
                                call.resolve(o);
                            }

                            @Override
                            public void onAuthenticationError(int code, CharSequence msg) {
                                if (done) return;
                                done = true;
                                call.reject(String.valueOf(msg), String.valueOf(code));
                            }
                        });
                BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(titel)
                        .setSubtitle("Fingerabdruck oder Display-Sperre")
                        .setAllowedAuthenticators(AUTH)
                        .build();
                bp.authenticate(info);
            } catch (Throwable e) {
                call.reject("Sperre nicht verfügbar: " + e.getMessage());
            }
        });
    }
}
