/**
 * Subscription/premium gating utility.
 *
 * Freemium = 1 session/day, generic suggestions.
 * Premium ($3.99/mo or $29.99/yr) = unlimited sessions,
 * personalized suggestions, smart scheduling, streaks & analytics.
 *
 * For MVP, this uses AsyncStorage stubs (no real payments).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'focutime_subscription';
const SESSION_COUNT_KEY = 'focutime_session_count';
const SESSION_DATE_KEY = 'focutime_session_date';

export interface SubscriptionState {
  isPremium: boolean;
  expiryDate: string | null;
  plan: 'free' | 'monthly' | 'yearly' | null;
}

const FREE_SESSION_LIMIT = 1;

/**
 * Get the current subscription state.
 */
export async function getSubscriptionState(): Promise<SubscriptionState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as SubscriptionState;
      // Check if expired
      if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
        // Expired — reset to free
        await setSubscriptionState({
          isPremium: false,
          expiryDate: null,
          plan: 'free',
        });
        return { isPremium: false, expiryDate: null, plan: 'free' };
      }
      return data;
    }
  } catch (e) {
    console.error('[Subscription] Failed to load', e);
  }
  return { isPremium: false, expiryDate: null, plan: 'free' };
}

/**
 * Save subscription state.
 */
export async function setSubscriptionState(
  state: SubscriptionState
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * "Purchase" premium — stub for MVP. In production, this would use
 * Stripe/RevenueCat/Google Play Billing + App Store In-App Purchases.
 */
export async function purchasePremium(
  plan: 'monthly' | 'yearly'
): Promise<boolean> {
  try {
    const now = new Date();
    let expiryDate: Date;

    if (plan === 'monthly') {
      expiryDate = new Date(now.setMonth(now.getMonth() + 1));
    } else {
      expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    await setSubscriptionState({
      isPremium: true,
      expiryDate: expiryDate.toISOString(),
      plan,
    });

    return true;
  } catch (e) {
    console.error('[Subscription] Purchase failed', e);
    return false;
  }
}

/**
 * Get today's session count for free tier gating.
 */
export async function getTodaySessionCount(): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = await AsyncStorage.getItem(SESSION_DATE_KEY);
    const storedCount = await AsyncStorage.getItem(SESSION_COUNT_KEY);

    if (storedDate === today) {
      return storedCount ? parseInt(storedCount, 10) : 0;
    }
    // New day — reset
    await AsyncStorage.setItem(SESSION_DATE_KEY, today);
    await AsyncStorage.setItem(SESSION_COUNT_KEY, '0');
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Increment today's session count.
 */
export async function incrementSessionCount(): Promise<void> {
  const count = await getTodaySessionCount();
  const today = new Date().toISOString().split('T')[0];
  await AsyncStorage.setItem(SESSION_DATE_KEY, today);
  await AsyncStorage.setItem(SESSION_COUNT_KEY, String(count + 1));
}

/**
 * Check if the user can start a new session.
 * Free: 1 session/day. Premium: unlimited.
 */
export async function canStartSession(): Promise<{
  allowed: boolean;
  reason?: 'free_limit' | 'ok';
}> {
  const sub = await getSubscriptionState();
  if (sub.isPremium) {
    return { allowed: true, reason: 'ok' };
  }

  const todayCount = await getTodaySessionCount();
  if (todayCount >= FREE_SESSION_LIMIT) {
    return { allowed: false, reason: 'free_limit' };
  }

  return { allowed: true, reason: 'ok' };
}

/**
 * Get premium features list for display.
 */
export const PREMIUM_FEATURES = [
  {
    id: 'unlimited',
    title: 'Unlimited Sessions',
    description: 'No daily limit — focus as much as you want',
    icon: '♾️',
  },
  {
    id: 'personalized',
    title: 'Personalized Suggestions',
    description: 'Smart activity recommendations based on your habits',
    icon: '🎯',
  },
  {
    id: 'scheduling',
    title: 'Smart Scheduling',
    description: 'Auto-lock apps during your peak distraction hours',
    icon: '⏰',
  },
  {
    id: 'analytics',
    title: 'Advanced Analytics',
    description: 'Detailed streaks, trends, and focus insights',
    icon: '📈',
  },
  {
    id: 'blocking',
    title: 'Full App Blocking',
    description: 'Block unlimited apps — not just the default list',
    icon: '🚫',
  },
];