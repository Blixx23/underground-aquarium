package com.undergroundaquarium.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Sign-in for the Android app ("AppAuth" in the site's lib/app/nativeSignIn.ts),
 * the Android twin of the iPhone plugin in ios/App/App/AppDelegate.swift.
 *
 * webSignIn opens the sign-in page (Google, or Apple on Android) in a Chrome
 * Custom Tab. Google blocks sign-in inside web views but allows Custom Tabs.
 * When the page sends the person to com.undergroundaquarium.app://auth-callback,
 * Android hands that address back to this app (see the intent filter in
 * AndroidManifest.xml) and the plugin returns it to the site.
 *
 * Closing the tab without finishing rejects with code "CANCELED" so the site
 * stays quiet. There is no native Sign in with Apple on Android, so the site
 * uses webSignIn for Apple here.
 */
@CapacitorPlugin(name = "AppAuth")
public class AppAuthPlugin extends Plugin {
    private static final String SCHEME = "com.undergroundaquarium.app";
    private String pendingCallId;
    private boolean tabOpen = false;

    @PluginMethod
    public void webSignIn(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing sign-in address");
            return;
        }
        // One sign-in at a time; a new one replaces an abandoned one.
        if (pendingCallId != null) {
            PluginCall old = bridge.getSavedCall(pendingCallId);
            if (old != null) {
                old.reject("Sign-in closed", "CANCELED");
                bridge.releaseCall(old);
            }
        }
        call.setKeepAlive(true);
        bridge.saveCall(call);
        pendingCallId = call.getCallbackId();
        tabOpen = true;
        getActivity().runOnUiThread(() -> {
            try {
                CustomTabsIntent tab = new CustomTabsIntent.Builder().setShowTitle(true).build();
                tab.launchUrl(getActivity(), Uri.parse(url));
            } catch (Exception e) {
                finish(null, "Couldn't open sign-in");
            }
        });
    }

    /** Android delivers the auth-callback address here. */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        Uri data = intent != null ? intent.getData() : null;
        if (data != null && SCHEME.equals(data.getScheme())) {
            finish(data.toString(), null);
        }
    }

    /**
     * Back in the app with no callback means the tab was closed. Wait a moment,
     * since the callback intent and the resume can arrive in either order.
     */
    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (!tabOpen) return;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (tabOpen) finish(null, "CANCELED");
        }, 800);
    }

    private void finish(String url, String error) {
        tabOpen = false;
        if (pendingCallId == null) return;
        PluginCall call = bridge.getSavedCall(pendingCallId);
        pendingCallId = null;
        if (call == null) return;
        if (url != null) {
            JSObject ret = new JSObject();
            ret.put("url", url);
            call.resolve(ret);
        } else if ("CANCELED".equals(error)) {
            call.reject("Sign-in closed", "CANCELED");
        } else {
            call.reject(error != null ? error : "Sign-in didn't finish");
        }
        bridge.releaseCall(call);
    }
}
