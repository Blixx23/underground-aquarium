# Underground Aquarium app

The iPhone (and later Android) app. It's a native shell around the live site,
so site updates show up in the app as soon as Vercel deploys them. Only
changes to this folder need a new App Store build.

## Run it in the iPhone Simulator

```
cd ~/Developer/undergroundaquarium/mobile && npm install && npx cap sync ios && npx cap open ios
```

Xcode opens. Pick an iPhone at the top (e.g. iPhone 16), press ▶.

## What's in here

- `capacitor.config.ts`: the app's settings (opens the live site, offline screen, user agent "UAApp").
- `www/offline.html`: shown when there's no internet.
- `assets/`: the icon and splash source images. After changing them:
  `npx @capacitor/assets generate --ios --iconBackgroundColor '#020b18' --splashBackgroundColor '#020b18'`
- `ios/App/App/AppDelegate.swift`: `MainViewController` adds swipe-back and pull-to-refresh.
