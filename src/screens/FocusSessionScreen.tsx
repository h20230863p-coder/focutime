import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, FocusSession } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import {
  startBlocking,
  stopBlocking,
  getPermissionStatus,
  BLOCKED_APPS_DEFAULT,
} from '../native-modules/AppBlocker';

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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const sessionStartedRef = useRef(false);

  // Start app blocking when session begins
  useEffect(() => {
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      initializeBlocking();
    }

    return () => {
      if (blockingActive) {
        stopBlocking();
      }
    };
  }, []);

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

  const initializeBlocking = async () => {
    try {
      // Check permissions and start blocking
      const status = await getPermissionStatus();
      if (Platform.OS === 'android' && !status.usageStatsGranted) {
        // Silently continue — app still works as a timer without blocking
        console.log('[FocusSession] UsageStats not granted — timer only mode');
      }
      const result = await startBlocking({
        blockedApps: [...BLOCKED_APPS_DEFAULT],
        durationMinutes: duration,
      });
      setBlockingActive(result.success);
    } catch (e) {
      console.log('[FocusSession] Blocking not available — timer only mode');
    }
  };

  const handleSessionComplete = async (completed: boolean) => {
    // Stop app blocking
    if (blockingActive) {
      await stopBlocking();
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
              🔒 Distraction blocking active
            </Text>
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