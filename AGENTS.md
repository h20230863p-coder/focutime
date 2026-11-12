@AGENTS.md
# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Running FocuTime — app blocking only works in a development build

App blocking is a custom native module (`modules/focutime-blocker`). **Expo Go cannot load it**, so in Expo Go the app runs as a timer only and shows a banner saying so.

```bash
npm install
npx expo run:android        # builds and installs the dev build on a connected device/emulator
```

On the phone, to make blocking actually work:

1. Open FocuTime → the permission screen → grant **Usage access**.
2. Grant **Display over other apps** (Settings → Apps → Special access → Display over other apps → FocuTime).
3. Enable **FocuTime App Blocker** in Settings → Accessibility → Installed apps.
4. On the timer screen tap **Choose apps to block**, tick apps (Instagram, TikTok, …), save.
5. Start a session and open one of those apps: a full-screen "Stay Focused" screen appears instead.

Platform limits: **Android** blocks apps through an AccessibilityService + overlay. **iOS cannot block other apps at all** — the app offers Guided Access instructions only, and the app picker is Android-only.

Type-check with `npx tsc --noEmit`.
