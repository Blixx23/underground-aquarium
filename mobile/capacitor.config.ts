import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The Underground Aquarium app is a native shell around the live site, so
 * every site update shows up in the app the moment it deploys.
 *
 * - server.url: the app opens the real site.
 * - errorPath: if the site can't be reached (no signal), the app shows its
 *   own offline screen instead of a browser error.
 * - Links to other sites open in Safari (Capacitor does this for any host
 *   not in allowNavigation), so nobody gets stuck inside a web page.
 * - appendUserAgent: the site can tell it's running in the app ("UAApp") and
 *   adjust, e.g. not showing the Society dues checkout.
 */
const config: CapacitorConfig = {
  appId: "com.undergroundaquarium.app",
  appName: "Underground Aquarium",
  webDir: "www",
  backgroundColor: "#020b18",
  server: {
    // The app opens on /start: signed in goes to the feed, signed out sees the welcome screen.
    url: "https://www.undergroundaquarium.com/start",
    errorPath: "offline.html",
    allowNavigation: ["www.undergroundaquarium.com", "undergroundaquarium.com"],
  },
  ios: {
    backgroundColor: "#020b18",
    contentInset: "never",
    appendUserAgent: "UAApp/1.0",
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#020b18",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#020b18",
      overlaysWebView: true,
    },
  },
};

export default config;
