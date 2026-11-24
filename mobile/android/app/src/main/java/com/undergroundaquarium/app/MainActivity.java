package com.undergroundaquarium.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * The screen that holds the website. Registers the app's own sign-in plugin
 * (AppAuthPlugin). Swipe/back: Android's back button and back gesture go back
 * through the site's pages, Capacitor's default.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
