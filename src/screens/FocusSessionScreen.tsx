import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  AppState,
  AppStateStatus,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, FocusSession } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import {
  startBlocking,
  stopBlocking,
  openAccessibilitySettings,
  BLOCKING_UNAVAILABLE_MESSAGE,
  IOS_BLOCKING_UNAVAILABLE_MESSAGE,
  ACCESSIBILITY_DISABLED_MESSAGE,
  BlockingError,
} from '../native-modules/AppBlocker';
import { getBlockedApps } from '../utils/storage';

type FocusSessionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'FocusSession'>;
  route: RouteProp<RootStackParamList, 'FocusSession'>;
};

export default function FocusSessionScreen({
  navigation,
  route,
}: FocusSessionScreenProps) {
  const { duration } = route.params;
  const totalSeconds = duration * 60;
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [blockingActive, setBlockingActive] = useState(false);
  const [blockingError, setBlockingError] = useState<BlockingError | null>(null);
  const [blockedAppsCount, setBlockedAppsCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const sessionStartedRef = useRef(false);
  const blockingActiveRef = useRef(false);
  const firstFocusRef = useRef(true);

  const updateBlocking = useCallback((active: boolean) => {
    blockingActiveRef.current = active;
    setBlockingActive(active);
  }, []);

  const initializeBlocking = useCallback(async () => {
    try {
      const blockedApps = await getBlockedApps();
      setBlockedAppsCount(blockedApps.length);

      if (blockedApps.length === 0) {
        // Never claim blocking without a selection — point the user at the picker.
        setBlockingError('no-apps-selected');
        updateBlocking(false);
        return;
      }

      const result = await startBlocking({
        blockedApps,
        durationMinutes: duration,
      });

      if (result.success) {
        setBlockingError(null);
        updateBlocking(true);
      } else {
        setBlockingError((result.error as BlockingError) ?? 'unknown');
        updateBlocking(false);
      }
    } catch (e) {
      console.error('[FocusSession] Blocking could not start', e);
      setBlockingError('unknown');
      updateBlocking(false);
    }
  }, [duration, updateBlocking]);

  // Start app blocking when the session begins
  useEffect(() => {
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      initializeBlocking();
    }

    return () => {
      if (blockingActiveRef.current) {
        stopBlocking();
      }
    };
  }, [initializeBlocking]);

  // Coming back from the app picker or the accessibility settings: try again.
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      if (!blockingActiveRef.current && sessionStartedRef.current) {
        initializeBlocking();
      }
    }, [initializeBlocking])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/active/) &&
          nextAppState.match(/inactive|background/)
        ) {
          // Timer still runs in background — app blocking handles the rest
          setIsRunning(true);
        }
        appStateRef.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            handleSessionComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleSessionComplete = async (completed: boolean) => {
    // Stop app blocking
    if (blockingActiveRef.current) {
      await stopBlocking();
      updateBlocking(false);
    }

    const secondsElapsed = totalSeconds - secondsRemaining;

    const session: FocusSession = {
      id: Date.now().toString(),
      startTime: Date.now() - secondsElapsed * 1000,
      duration,
      completed,
      abandoned: !completed,
      date: new Date().toISOString().split('T')[0],
    };

    try {
      const existing = await AsyncStorage.getItem('sessions');
      const sessions: FocusSession[] = existing ? JSON.parse(existing) : [];
      sessions.push(session);
      await AsyncStorage.setItem('sessions', JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save session', e);
    }

    // Clear timer interval before navigating
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    navigation.replace('Suggestions', {
      sessionCompleted: completed,
      duration,
    });
  };

  const togglePause = () => {
    setIsRunning((prev) => !prev);
  };

  const handleQuit = () => {
    setShowQuitConfirm(true);
  };

  const confirmQuit = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    handleSessionComplete(false);
  };

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = 1 - secondsRemaining / totalSeconds;

  const banner = (() => {
    if (blockingActive) return null;
    switch (blockingError) {
      case 'native-module-missing':
        return {
          text: BLOCKING_UNAVAILABLE_MESSAGE,
          actionLabel: undefined as string | undefined,
          onPress: undefined as (() => void) | undefined,
        };
      case 'ios-not-supported':
        return {
          text: IOS_BLOCKING_UNAVAILABLE_MESSAGE,
          actionLabel: undefined,
          onPress: undefined,
        };
      case 'accessibility-disabled':
        return {
          text: ACCESSIBILITY_DISABLED_MESSAGE,
          actionLabel: 'Open Accessibility settings',
          onPress: () => {
            openAccessibilitySettings();
          },
        };
      case 'no-apps-selected':
        return {
          text: 'No apps are selected, so nothing is being blocked. Your timer is running normally.',
          actionLabel: 'Choose apps to block',
          onPress: () => navigation.navigate('AppSelection'),
        };
      default:
        return {
          text: 'Distraction blocking could not start. Your timer is running normally.',
          actionLabel: undefined,
          onPress: undefined,
        };
    }
  })();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.focusLabel}>FOCUS TIME</Text>

        <View style={styles.timerCircle}>
          <View
            style={[
              styles.progressRing,
              { width: 260, height: 260, borderRadius: 130 },
            ]}
          >
            <View style={styles.innerCircle}>
              <Text style={styles.timerText}>
                {formatTime(secondsRemaining)}
              </Text>
              <Text style={styles.statusText}>
                {isRunning ? 'Stay focused 💪' : 'Paused ⏸'}
              </Text>
            </View>
          </View>
        </View>

        {blockingActive && (
          <View style={styles.blockingBadge}>
            <Text style={styles.blockingBadgeText}>
              🔒 Blocking {blockedAppsCount} app
              {blockedAppsCount === 1 ? '' : 's'}
            </Text>
          </View>
        )}

        {banner && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner.text}</Text>
            {banner.actionLabel && banner.onPress && (
              <TouchableOpacity
                style={styles.bannerButton}
                onPress={banner.onPress}
                activeOpacity={0.7}
              >
                <Text style={styles.bannerButtonText}>{banner.actionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.pauseButton]}
            onPress={togglePause}
            activeOpacity={0.7}
          >
            <Text style={styles.controlButtonText}>
              {isRunning ? '⏸ Pause' : '▶ Resume'}
            </Text>
          </TouchableOpacity>

          {!showQuitConfirm ? (
            <TouchableOpacity
              style={[styles.controlButton, styles.quitButton]}
              onPress={handleQuit}
              activeOpacity={0.7}
            >
              <Text style={[styles.controlButtonText, styles.quitButtonText]}>
                ✕ Quit
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={[styles.controlButton, styles.confirmQuitButton]}
                onPress={confirmQuit}
                activeOpacity={0.7}
              >
                <Text style={[styles.controlButtonText, styles.quitButtonText]}>
                  Yes, quit session
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowQuitConfirm(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% complete
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  focusLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: SPACING.lg,
  },
  timerCircle: {
    marginBottom: SPACING.lg,
  },
  progressRing: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  innerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xs,
  },
  blockingBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  blockingBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  banner: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    width: '100%',
    gap: SPACING.sm,
  },
  bannerText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  bannerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignSelf: 'center',
  },
  bannerButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  controlButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  pauseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  quitButton: {
    backgroundColor: 'rgba(255,82,82,0.3)',
  },
  quitButtonText: {
    color: '#FF6B6B',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  confirmQuitButton: {
    backgroundColor: 'rgba(255,82,82,0.5)',
  },
  cancelButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZES.sm,
  },
  progressBarContainer: {
    width: '80%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
});
