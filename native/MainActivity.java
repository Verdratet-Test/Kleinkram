package de.kleinkram.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KleinkramNativePlugin.class);
        registerPlugin(AufraeumenPlugin.class);
        registerPlugin(TexterkennungPlugin.class);
        registerPlugin(SperrePlugin.class);
        registerPlugin(WeckerPlugin.class);
        super.onCreate(savedInstanceState);
        /* vom Wecker geöffnet: über dem Sperrbildschirm zeigen und Bildschirm anschalten */
        if (getIntent() != null && getIntent().hasExtra("kk_wecker") && WeckerService.curId != null) {
            if (android.os.Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
            else getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }
}
