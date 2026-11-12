/**
 * AppBlocker — Native module for Android app blocking and iOS Guided Access.
 *
 * Android:
 * - Uses AccessibilityService to detect when blocked apps are opened
 * - Shows full-screen overlay when a distraction app is launched
 * - Uses UsageStats API for permission checking
 * - Supports Lock Task (screen pinning) via Device Admin
 *
 * iOS:
 * - Full app blocking isn't available
 * - Provides Guided Access instructions and settings shortcut
 *
 * IMPORTANT: the native module only exists in a development build
 * (`npx expo run:android`). In Expo Go it is undefined and blocking is
 * impossible — the functions below report that honestly instead of pretending
 * a session is being enforced.
 */

import { Platform, NativeModules, Linking } from 'react-native';

const { FocuTimeBlocker } = NativeModules;

/** Shown whenever blocking cannot actually run. */
export const BLOCKING_UNAVAILABLE_MESSAGE =
  'App blocking needs the development build (npx expo run:android) — Expo Go cannot block apps.';

export const IOS_BLOCKING_UNAVAILABLE_MESSAGE =
  'iOS cannot block other apps. Use Guided Access (Settings → Accessibility → Guided Access) during a session.';

export const ACCESSIBILITY_DISABLED_MESSAGE =
  'FocuTime can\'t block anything until its Accessibility service is switched on. Tap to open Settings → Accessibility → Installed apps → FocuTime App Blocker.';

export type BlockingError =
  | 'native-module-missing'
  | 'ios-not-supported'
  | 'accessibility-disabled'
  | 'no-apps-selected'
  | 'unknown';

export interface AppBlockerConfig {
  /** Package names (Android) or bundle IDs (iOS) to block */
  blockedApps: string[];
  /** Duration in minutes */
  durationMinutes: number;
}

export interface AppBlockerResult {
  success: boolean;
  error?: BlockingError | string;
  timeElapsedSeconds: number;
  /** Number of apps actually handed to the native layer. */
  blockedCount?: number;
  /** Whether the accessibility service (the part that enforces the block) is on. */
  accessibilityServiceEnabled?: boolean;
}

export interface InstalledApp {
  /** Android package name, e.g. com.instagram.android */
  package: string;
  /** Human readable app name */
  label: string;
  isSystem: boolean;
}

export interface PermissionStatus {
  usageStatsGranted: boolean;
  overlayGranted: boolean;
  lockTaskSupported: boolean;
  accessibilityServiceEnabled: boolean;
}

export interface PermissionStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  key: keyof PermissionStatus;
  actionLabel: string;
  action: () => Promise<boolean>;
  required: boolean;
}

/**
 * True only when the native blocker is actually linked into the running app.
 * False in Expo Go, on web, and on iOS.
 */
export function isNativeBlockerAvailable(): boolean {
  return (
    Platform.OS === 'android' &&
    !!FocuTimeBlocker &&
    typeof FocuTimeBlocker.startBlocking === 'function'
  );
}

/**
 * Whether this platform/build can enforce app blocking at all.
 */
export function canBlockApps(): boolean {
  return isNativeBlockerAvailable();
}

/**
 * Check all required permissions status for Android.
 */
export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (isNativeBlockerAvailable()) {
    try {
      const status = await FocuTimeBlocker.checkAllPermissions();
      return status as PermissionStatus;
    } catch (e) {
      console.error('[AppBlocker] Failed to check permissions', e);
      return {
        usageStatsGranted: false,
        overlayGranted: false,
        lockTaskSupported: false,
        accessibilityServiceEnabled: false,
      };
    }
  }
  // iOS: no permissions needed
  return {
    usageStatsGranted: true,
    overlayGranted: true,
    lockTaskSupported: false,
    accessibilityServiceEnabled: false,
  };
}

/**
 * Request UsageStats permission (Android).
 * Opens system settings for the user to grant permission.
 */
export async function requestUsageStatsPermission(): Promise<boolean> {
  if (isNativeBlockerAvailable()) {
    try {
      return await FocuTimeBlocker.requestUsageStatsPermission();
    } catch (e) {
      console.error('[AppBlocker] Failed to request usage stats', e);
      return false;
    }
  }
  return true;
}

/**
 * Request overlay permission (Android).
 * Opens "Display over other apps" for FocuTime specifically.
 */
export async function requestOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (isNativeBlockerAvailable()) {
    try {
      return await FocuTimeBlocker.requestOverlayPermission();
    } catch (e) {
      console.error('[AppBlocker] Failed to open overlay settings', e);
      return false;
    }
  }
  // Fallback for Expo Go: we cannot deep-link without the native module.
  try {
    await Linking.openSettings();
  } catch (e) {
    console.error('[AppBlocker] Failed to open settings', e);
  }
  return false;
}

/**
 * Open Android accessibility settings so the user can enable the service.
 */
export async function openAccessibilitySettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  if (isNativeBlockerAvailable()) {
    try {
      await FocuTimeBlocker.openAccessibilitySettings();
      return;
    } catch (e) {
      console.error('[AppBlocker] Native accessibility settings failed', e);
    }
  }
  try {
    await Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
  } catch {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.error('[AppBlocker] Failed to open accessibility settings', e);
    }
  }
}

/**
 * Launcher apps the user can choose to block.
 * Returns an empty list when the native module is missing (Expo Go).
 */
export async function getInstalledApps(refresh = false): Promise<InstalledApp[]> {
  if (!isNativeBlockerAvailable()) {
    return [];
  }
  try {
    const apps: InstalledApp[] = await FocuTimeBlocker.getInstalledApps(refresh);
    return Array.isArray(apps) ? apps : [];
  } catch (e) {
    console.error('[AppBlocker] Failed to list installed apps', e);
    return [];
  }
}

/**
 * Start blocking the specified apps for the given duration.
 * Never reports success unless the native module is present and the
 * accessibility service that enforces the block is enabled.
 */
export async function startBlocking(
  config: AppBlockerConfig
): Promise<AppBlockerResult> {
  if (Platform.OS === 'ios') {
    return {
      success: false,
      error: 'ios-not-supported',
      timeElapsedSeconds: 0,
    };
  }

  if (!isNativeBlockerAvailable()) {
    console.warn('[AppBlocker] Native module missing — blocking cannot run');
    return {
      success: false,
      error: 'native-module-missing',
      timeElapsedSeconds: 0,
    };
  }

  if (!config.blockedApps || config.blockedApps.length === 0) {
    return {
      success: false,
      error: 'no-apps-selected',
      timeElapsedSeconds: 0,
      blockedCount: 0,
    };
  }

  try {
    const result = await FocuTimeBlocker.startBlocking(
      config.blockedApps,
      config.durationMinutes
    );
    const accessibilityServiceEnabled =
      result?.accessibilityServiceEnabled !== false;

    if (!accessibilityServiceEnabled) {
      return {
        success: false,
        error: 'accessibility-disabled',
        timeElapsedSeconds: 0,
        blockedCount: config.blockedApps.length,
        accessibilityServiceEnabled: false,
      };
    }

    return {
      success: true,
      timeElapsedSeconds: config.durationMinutes * 60,
      blockedCount: config.blockedApps.length,
      accessibilityServiceEnabled: true,
    };
  } catch (e) {
    console.error('[AppBlocker] Failed to start blocking', e);
    return {
      success: false,
      error: 'unknown',
      timeElapsedSeconds: 0,
    };
  }
}

/**
 * Stop blocking and clean up.
 */
export async function stopBlocking(): Promise<void> {
  if (isNativeBlockerAvailable()) {
    try {
      await FocuTimeBlocker.stopBlocking();
    } catch (e) {
      console.error('[AppBlocker] Failed to stop blocking', e);
    }
  }
}

/**
 * Check if overlay permission is granted (Android).
 */
export function isOverlayPermissionGranted(): boolean {
  return !(Platform.OS === 'android' && !isNativeBlockerAvailable());
}

/**
 * Get permission steps for the permission-gating flow.
 * Returns steps only for permissions that are NOT yet granted.
 */
export async function getPendingPermissionSteps(): Promise<PermissionStep[]> {
  if (Platform.OS === 'ios') {
    return [];
  }

  const status = await getPermissionStatus();
  const steps: PermissionStep[] = [];

  if (!status.usageStatsGranted) {
    steps.push({
      id: 'usage_stats',
      title: 'Usage Access',
      description: 'Allow FocuTime to see which apps you use, so it can block distractions.',
      icon: '📊',
      key: 'usageStatsGranted',
      actionLabel: 'Open Settings',
      action: requestUsageStatsPermission,
      required: true,
    });
  }

  // The accessibility service is what actually detects a blocked app opening.
  if (!status.accessibilityServiceEnabled) {
    steps.push({
      id: 'accessibility',
      title: 'Accessibility Service',
      description:
        'Switch on "FocuTime App Blocker" in Accessibility so FocuTime can spot a blocked app the moment you open it.',
      icon: '♿',
      key: 'accessibilityServiceEnabled',
      actionLabel: 'Open Accessibility Settings',
      action: async () => {
        await openAccessibilitySettings();
        return false;
      },
      required: true,
    });
  }

  if (!status.overlayGranted) {
    steps.push({
      id: 'overlay',
      title: 'Display Overlay',
      description: 'Allow FocuTime to show a focus overlay on top of other apps.',
      icon: '🖥️',
      key: 'overlayGranted',
      actionLabel: 'Open Settings',
      action: requestOverlayPermission,
      required: false,
    });
  }

  return steps;
}

/**
 * Package names of the apps most people want to block. Used to pre-tick the
 * "Suggested" section in the app picker (matched by package *and* by label, so
 * regional package variants like TikTok's com.zhiliaoapp.musically still match).
 */
export const SUGGESTED_DISTRACTORS: { package: string; label: string }[] = [
  { package: 'com.instagram.android', label: 'Instagram' },
  { package: 'com.zhiliaoapp.musically', label: 'TikTok' },
  { package: 'com.ss.android.ugc.trill', label: 'TikTok' },
  { package: 'com.twitter.android', label: 'X' },
  { package: 'com.google.android.youtube', label: 'YouTube' },
  { package: 'com.reddit.frontpage', label: 'Reddit' },
  { package: 'com.facebook.katana', label: 'Facebook' },
  { package: 'com.snapchat.android', label: 'Snapchat' },
  { package: 'com.netflix.mediaclient', label: 'Netflix' },
];

/**
 * Human-readable names for common blocked apps.
 */
export const BLOCKED_APP_NAMES: Record<string, string> = {
  'com.instagram.android': 'Instagram',
  'com.facebook.katana': 'Facebook',
  'com.twitter.android': 'Twitter / X',
  'com.tiktok.android': 'TikTok',
  'com.zhiliaoapp.musically': 'TikTok',
  'com.snapchat.android': 'Snapchat',
  'com.pinterest': 'Pinterest',
  'com.reddit.frontpage': 'Reddit',
  'com.youtube.android': 'YouTube',
  'com.google.android.youtube': 'YouTube',
  'com.netflix.mediaclient': 'Netflix',
  'com.spotify.music': 'Spotify',
};
