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
 */

import { Platform, NativeModules, Linking } from 'react-native';

const { FocuTimeBlocker } = NativeModules;

export interface AppBlockerConfig {
  /** Package names (Android) or bundle IDs (iOS) to block */
  blockedApps: string[];
  /** Duration in minutes */
  durationMinutes: number;
}

export interface AppBlockerResult {
  success: boolean;
  error?: string;
  timeElapsedSeconds: number;
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
 * Check all required permissions status for Android.
 */
export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'android' && FocuTimeBlocker) {
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
  if (Platform.OS === 'android' && FocuTimeBlocker) {
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
 * Opens system settings for the user to allow overlay.
 */
export async function requestOverlayPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      await Linking.openSettings();
      return false;
    } catch (e) {
      console.error('[AppBlocker] Failed to open overlay settings', e);
      return false;
    }
  }
  return true;
}

/**
 * Open Android accessibility settings so the user can enable the service.
 */
export async function openAccessibilitySettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
    } catch {
      // Fallback: open general settings
      try {
        await Linking.openSettings();
      } catch (e) {
        console.error('[AppBlocker] Failed to open accessibility settings', e);
      }
    }
  }
}

/**
 * Start blocking the specified apps for the given duration.
 */
export async function startBlocking(config: AppBlockerConfig): Promise<AppBlockerResult> {
  if (!FocuTimeBlocker) {
    console.warn('[AppBlocker] Native module not available — running in mock mode');
    return {
      success: true,
      timeElapsedSeconds: config.durationMinutes * 60,
    };
  }

  try {
    const result = await FocuTimeBlocker.startBlocking(
      config.blockedApps,
      config.durationMinutes
    );
    return {
      success: true,
      timeElapsedSeconds: config.durationMinutes * 60,
      ...(Platform.OS === 'ios' ? { guidedAccessRequired: result?.guidedAccessRequired } : {}),
    };
  } catch (e) {
    console.error('[AppBlocker] Failed to start blocking', e);
    return {
      success: false,
      error: String(e),
      timeElapsedSeconds: 0,
    };
  }
}

/**
 * Stop blocking and clean up.
 */
export async function stopBlocking(): Promise<void> {
  if (FocuTimeBlocker) {
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
  return !(Platform.OS === 'android' && !FocuTimeBlocker);
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
 * Get human-readable blocked app names.
 */
export const BLOCKED_APPS_DEFAULT = [
  'com.instagram.android',
  'com.facebook.katana',
  'com.twitter.android',
  'com.tiktok.android',
  'com.snapchat.android',
  'com.pinterest',
  'com.reddit.frontpage',
  'com.youtube.android',
  'com.netflix.mediaclient',
  'com.spotify.music',
] as const;

/**
 * Human-readable names for common blocked apps.
 */
export const BLOCKED_APP_NAMES: Record<string, string> = {
  'com.instagram.android': 'Instagram',
  'com.facebook.katana': 'Facebook',
  'com.twitter.android': 'Twitter / X',
  'com.tiktok.android': 'TikTok',
  'com.snapchat.android': 'Snapchat',
  'com.pinterest': 'Pinterest',
  'com.reddit.frontpage': 'Reddit',
  'com.youtube.android': 'YouTube',
  'com.netflix.mediaclient': 'Netflix',
  'com.spotify.music': 'Spotify',
};