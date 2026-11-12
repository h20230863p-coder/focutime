import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import {
  canStartSession,
  incrementSessionCount,
  getSubscriptionState,
} from '../utils/subscription';
import { getBlockedApps } from '../utils/storage';
import { isNativeBlockerAvailable } from '../native-modules/AppBlocker';

type TimerSetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TimerSetup'>;
};

const PRESET_TIMES = [5, 10, 15, 25, 30, 45, 60];

export default function TimerSetupScreen({ navigation }: TimerSetupScreenProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [isPremium, setIsPremium] = useState(false);
  const [sessionsUsed, setSessionsUsed] = useState(0);
  const [checking, setChecking] = useState(true);
  const [blockedCount, setBlockedCount] = useState(0);

  const nativeBlockerAvailable = isNativeBlockerAvailable();

  useEffect(() => {
    loadStatus();
  }, []);

  // Keep the "N apps selected" row in sync when coming back from the picker.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getBlockedApps().then((apps) => {
        if (active) setBlockedCount(apps.length);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const loadStatus = async () => {
    const sub = await getSubscriptionState();
    setIsPremium(sub.isPremium);
    if (!sub.isPremium) {
      const count = await loadTodaySessionCount();
      setSessionsUsed(count);
    }
    setChecking(false);
  };

  const loadTodaySessionCount = async () => {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = await AsyncStorage.getItem('focutime_session_date');
    const storedCount = await AsyncStorage.getItem('focutime_session_count');
    if (storedDate === today) {
      return storedCount ? parseInt(storedCount, 10) : 0;
    }
    return 0;
  };

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handleStart = async () => {
    // 1. Check subscription gate
    const { allowed, reason } = await canStartSession();
    if (!allowed && reason === 'free_limit') {
      navigation.navigate('Paywall');
      return;
    }

    // 2. Check permission gate (first time only)
    const permissionsSeen = await AsyncStorage.getItem('permissions_seen');
    if (!permissionsSeen) {
      navigation.navigate('PermissionGate');
      return;
    }

    // 3. Start session
    await incrementSessionCount();
    navigation.navigate('FocusSession', { duration: selectedMinutes });
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const remaining = 1 - sessionsUsed;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.appName}>⏱️ FocuTime</Text>
          {!isPremium && (
            <TouchableOpacity
              style={styles.premiumBadge}
              onPress={() => navigation.navigate('Paywall')}
            >
              <Image 
                source={require('../../assets/premium/premium_badge.png')}
                style={styles.badgeIcon}
              />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </TouchableOpacity>
          )}
          {isPremium && (
            <View style={[styles.premiumBadge, styles.premiumBadgeActive]}>
              <Image 
                source={require('../../assets/premium/premium_badge.png')}
                style={styles.badgeIcon}
              />
              <Text style={styles.premiumBadgeActiveText}>Premium</Text>
            </View>
          )}
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Set Your Focus Time</Text>
          <Text style={styles.subtitle}>
            How long do you want to stay focused today?
          </Text>
        </View>

        {!isPremium && (
          <View style={styles.freeNotice}>
            <Text style={styles.freeNoticeText}>
              Free: {remaining} of {1} session{remaining !== 1 ? 's' : ''} remaining today
            </Text>
          </View>
        )}

        <View style={styles.timerDisplay}>
          <Text style={styles.timerValue}>{selectedMinutes}</Text>
          <Text style={styles.timerLabel}>minutes</Text>
        </View>

        <View style={styles.presetsContainer}>
          {PRESET_TIMES.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.presetButton,
                selectedMinutes === mins && styles.presetButtonSelected,
              ]}
              onPress={() => setSelectedMinutes(mins)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetText,
                  selectedMinutes === mins && styles.presetTextSelected,
                ]}
              >
                {formatTime(mins)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.appsRow}
          onPress={() => navigation.navigate('AppSelection')}
          activeOpacity={0.7}
        >
          <Text style={styles.appsRowIcon}>🚫</Text>
          <View style={styles.appsRowInfo}>
            <Text style={styles.appsRowTitle}>Choose apps to block</Text>
            <Text style={styles.appsRowSubtitle}>
              {blockedCount > 0
                ? `${blockedCount} app${blockedCount === 1 ? '' : 's'} selected`
                : 'No apps selected yet — tap to pick'}
            </Text>
          </View>
          <Text style={styles.appsRowChevron}>›</Text>
        </TouchableOpacity>

        {!nativeBlockerAvailable && (
          <Text style={styles.blockingUnavailable}>
            App blocking needs the development build (npx expo run:android) —
            Expo Go can only run the timer.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.startButton, remaining <= 0 && !isPremium && styles.startButtonDisabled]}
          onPress={handleStart}
          activeOpacity={0.8}
          disabled={remaining <= 0 && !isPremium}
        >
          <Text style={styles.startButtonText}>
            {remaining <= 0 && !isPremium
              ? 'Upgrade for More Sessions'
              : 'Start Focus Session'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    top: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  appName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  premiumBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.warning,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: {
    width: 16,
    height: 16,
  },
  premiumBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.warning,
    fontWeight: '700',
  },
  premiumBadgeActive: {
    backgroundColor: '#FFF8E1',
    borderColor: COLORS.warning,
  },
  premiumBadgeActiveText: {
    fontSize: FONT_SIZES.xs,
    color: '#F57F17',
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  freeNotice: {
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  freeNoticeText: {
    fontSize: FONT_SIZES.xs,
    color: '#F57F17',
    fontWeight: '600',
    textAlign: 'center',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  timerValue: {
    fontSize: FONT_SIZES.hero,
    fontWeight: '800',
    color: COLORS.primary,
  },
  timerLabel: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textMuted,
    marginTop: -SPACING.sm,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  presetButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  presetButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  presetTextSelected: {
    color: '#FFFFFF',
  },
  appsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  appsRowIcon: {
    fontSize: 22,
  },
  appsRowInfo: {
    flex: 1,
  },
  appsRowTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  appsRowSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  appsRowChevron: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textMuted,
  },
  blockingUnavailable: {
    fontSize: FONT_SIZES.xs,
    color: '#F57F17',
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    lineHeight: 17,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});