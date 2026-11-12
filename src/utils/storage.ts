import AsyncStorage from '@react-native-async-storage/async-storage';
import { FocusSession, OnboardingData, UserPreferences } from '../types';

const KEYS = {
  ONBOARDING: 'onboarding',
  SESSIONS: 'sessions',
  PREFERENCES: 'preferences',
  BLOCKED_APPS: 'focutime.blockedApps',
};

// Blocked apps (package names chosen in AppSelectionScreen)
export async function getBlockedApps(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BLOCKED_APPS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function saveBlockedApps(packages: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.BLOCKED_APPS, JSON.stringify(packages));
}

// Onboarding
export async function getOnboardingData(): Promise<OnboardingData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ONBOARDING);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveOnboardingData(data: OnboardingData): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING, JSON.stringify(data));
}

// Sessions
export async function getSessions(): Promise<FocusSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveSession(session: FocusSession): Promise<void> {
  const sessions = await getSessions();
  sessions.push(session);
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
}

// Preferences
export async function getPreferences(): Promise<UserPreferences | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PREFERENCES);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function savePreferences(
  prefs: Partial<UserPreferences>
): Promise<void> {
  const existing = await getPreferences();
  const merged = { ...existing, ...prefs } as UserPreferences;
  await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(merged));
}