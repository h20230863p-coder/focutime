import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPendingPermissionSteps,
  getPermissionStatus,
  PermissionStep,
  PermissionStatus,
  openAccessibilitySettings,
} from '../native-modules/AppBlocker';

type PermissionsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PermissionGate'>;
};

export default function PermissionsScreen({ navigation }: PermissionsScreenProps) {
  const [steps, setSteps] = useState<PermissionStep[]>([]);
  const [currentStatus, setCurrentStatus] = useState<PermissionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingStep, setCheckingStep] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const pendingSteps = await getPendingPermissionSteps();
      const status = await getPermissionStatus();
      setSteps(pendingSteps);
      setCurrentStatus(status);
    } catch (e) {
      console.error('[Permissions] Failed to load', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = async (step: PermissionStep) => {
    setCheckingStep(step.id);
    await step.action();
    // Give user time to toggle the setting, then check again
    setTimeout(async () => {
      await refreshPermissions();
      setCheckingStep(null);
    }, 2000);
  };

  const handleOpenAccessibilitySettings = async () => {
    setCheckingStep('accessibility');
    await openAccessibilitySettings();
    setTimeout(async () => {
      await refreshPermissions();
      setCheckingStep(null);
    }, 2000);
  };

  const refreshPermissions = async () => {
    const status = await getPermissionStatus();
    setCurrentStatus(status);
    const pendingSteps = await getPendingPermissionSteps();
    setSteps(pendingSteps);
  };

  const allGranted = steps.length === 0;

  const handleContinue = async () => {
    // Mark permissions as seen so we don't show again on next session
    await AsyncStorage.setItem('permissions_seen', 'true');
    navigation.replace('TimerSetup');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <Text style={styles.emoji}>🍎</Text>
          <Text style={styles.title}>iOS App Blocking</Text>
          <Text style={styles.subtitle}>
            iOS doesn't allow apps to block other apps programmatically.
            Instead, you can use Guided Access:
          </Text>

          <View style={styles.iosGuide}>
            <Text style={styles.iosStep}>1. Open Settings → Accessibility → Guided Access</Text>
            <Text style={styles.iosStep}>2. Toggle Guided Access ON</Text>
            <Text style={styles.iosStep}>3. Triple-click the side button during a session</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Got it, continue →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={styles.title}>Set Up Distraction Blocking</Text>
          <Text style={styles.subtitle}>
            FocuTime needs a few permissions to block distracting apps
            during your focus sessions. Without these, the app works as
            a timer only.
          </Text>
        </View>

        {allGranted ? (
          <View style={styles.allGrantedContainer}>
            <Text style={styles.grantedEmoji}>✅</Text>
            <Text style={styles.grantedTitle}>All permissions granted!</Text>
            <Text style={styles.grantedSubtitle}>
              FocuTime can now block distracting apps during your focus sessions.
            </Text>
          </View>
        ) : (
          <View style={styles.stepsContainer}>
            {steps.map((step) => {
              const isChecking = checkingStep === step.id;
              return (
                <View key={step.id} style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                    <View style={styles.stepInfo}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDesc}>{step.description}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.stepButton, isChecking && styles.stepButtonChecking]}
                    onPress={() => handleOpenSettings(step)}
                    disabled={isChecking}
                    activeOpacity={0.7}
                  >
                    {isChecking ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.stepButtonText}>{step.actionLabel}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Accessibility Service step - separate since it's handled differently */}
            {currentStatus && !currentStatus.accessibilityServiceEnabled && (
              <View style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepIcon}>♿</Text>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>Accessibility Service</Text>
                    <Text style={styles.stepDesc}>
                      Enable FocuTime's accessibility service to detect when you open
                      a blocked app and show a reminder.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.stepButton, checkingStep === 'accessibility' && styles.stepButtonChecking]}
                  onPress={handleOpenAccessibilitySettings}
                  disabled={checkingStep === 'accessibility'}
                  activeOpacity={0.7}
                >
                  {checkingStep === 'accessibility' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.stepButtonText}>Open Accessibility Settings</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.stepHint}>
                  After opening Settings, find "FocuTime" under Installed Apps
                  and toggle it on.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, allGranted && styles.primaryButtonActive]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {allGranted ? 'Start Focusing! →' : 'Continue (Timer Only Mode)'}
            </Text>
          </TouchableOpacity>

          {!allGranted && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshPermissions}
              activeOpacity={0.7}
            >
              <Text style={styles.refreshButtonText}>↻ Check permissions again</Text>
            </TouchableOpacity>
          )}
        </View>

        {!allGranted && (
          <View style={styles.timerOnlyNote}>
            <Text style={styles.timerOnlyText}>
              ⏱️ Timer mode still works great! You'll get the full focus timer
              experience — just without automatic app blocking.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  // All granted state
  allGrantedContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  grantedEmoji: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  grantedTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: SPACING.xs,
  },
  grantedSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: '#558B2F',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Permission steps
  stepsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  stepCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  stepIcon: {
    fontSize: 28,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  stepButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  stepButtonChecking: {
    opacity: 0.7,
    minWidth: 100,
  },
  stepButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  stepHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
  // Actions
  actions: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  primaryButtonActive: {
    backgroundColor: COLORS.success,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  refreshButton: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  timerOnlyNote: {
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
  },
  timerOnlyText: {
    fontSize: FONT_SIZES.sm,
    color: '#F57F17',
    textAlign: 'center',
    lineHeight: 20,
  },
  // iOS guide
  iosGuide: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  iosStep: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 22,
  },
});