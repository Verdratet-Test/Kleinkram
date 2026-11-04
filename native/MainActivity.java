package de.kleinkram.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KleinkramNativePlugin.class);
        registerPlugin(AufraeumenPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
