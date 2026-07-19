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
  Linking,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import {
  getPermissionStatus,
  PermissionStatus,
  openAccessibilitySettings,
} from '../native-modules/AppBlocker';

type PermissionGateScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PermissionGate'>;
};

interface PermissionItem {
  id: string;
  key: keyof PermissionStatus;
  title: string;
  description: string;
  settingsAction: string;
  icon: string;
  deepLink: () => Promise<void>;
}

function PermissionGateScreen({ navigation }: PermissionGateScreenProps) {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setLoading(true);
    const s = await getPermissionStatus();
    setStatus(s);
    setLoading(false);
  };

  const grantedCount = status
    ? [status.usageStatsGranted, status.overlayGranted, status.accessibilityServiceEnabled]
        .filter(Boolean).length
    : 0;
  const totalCount = 3;

  const permissions: PermissionItem[] = [
    {
      id: 'usage_stats',
      key: 'usageStatsGranted',
      title: 'Usage Access',
      description: 'Allow FocuTime to see app usage so it can block distractions.',
      settingsAction: 'Settings → Apps → App Usage Access → FocuTime',
      icon: '📊',
      deepLink: async () => {
        try {
          await Linking.sendIntent('android.settings.USAGE_ACCESS_SETTINGS');
        } catch {
          await Linking.openSettings();
        }
      },
    },
    {
      id: 'overlay',
      key: 'overlayGranted',
      title: 'Display Overlay',
      description: 'Allow FocuTime to show a focus overlay on top of other apps.',
      settingsAction: 'Settings → Apps → Draw Over Other Apps → FocuTime',
      icon: '🖥️',
      deepLink: async () => {
        try {
          await Linking.sendIntent('android.settings.MANAGE_OVERLAY_PERMISSION');
        } catch {
          await Linking.openSettings();
        }
      },
    },
    {
      id: 'accessibility',
      key: 'accessibilityServiceEnabled',
      title: 'Accessibility Service',
      description: 'Enable to detect when you open a blocked app and show a reminder.',
      settingsAction: 'Settings → Accessibility → Installed Apps → FocuTime',
      icon: '♿',
      deepLink: async () => {
        await openAccessibilitySettings();
      },
    },
  ];

  const openPermissionSetting = async (perm: PermissionItem) => {
    setCheckingId(perm.id);
    await perm.deepLink();
    // Give user time to toggle, then re-check
    setTimeout(async () => {
      const s = await getPermissionStatus();
      setStatus(s);
      setCheckingId(null);
    }, 3000);
  };

  const handleCheckAndContinue = async () => {
    setLoading(true);
    const s = await getPermissionStatus();
    setStatus(s);
    setLoading(false);
  };

  const handleContinueToSession = async () => {
    await AsyncStorage.setItem('permissions_seen', 'true');
    navigation.replace('TimerSetup');
  };

  const handleSkipTimerOnly = async () => {
    await AsyncStorage.setItem('permissions_seen', 'true');
    navigation.replace('TimerSetup');
  };

  if (loading && !status) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.checkingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🍎</Text>
            <Text style={styles.title}>iOS App Blocking</Text>
            <Text style={styles.subtitle}>
              iOS doesn't allow blocking apps programmatically. Use Guided Access instead.
            </Text>
          </View>
          <View style={styles.iosSteps}>
            {[
              'Settings → Accessibility → Guided Access',
              'Toggle Guided Access ON',
              'Triple-click side button during session',
            ].map((step, i) => (
              <View key={i} style={styles.iosStepRow}>
                <Text style={styles.iosStepNum}>{i + 1}</Text>
                <Text style={styles.iosStepText}>{step}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleContinueToSession} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Got it, continue →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const allGranted = grantedCount === totalCount;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/premium/lock_icon.png')}
            style={styles.headerImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Distraction Blocking Setup</Text>
          <Text style={styles.subtitle}>
            Grant these permissions so FocuTime can block distracting apps during sessions.
          </Text>
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                <View
                  style={[
                    styles.progressDot,
                    i < grantedCount ? styles.progressDotDone : styles.progressDotPending,
                  ]}
                >
                  <Text style={styles.progressDotText}>
                    {i < grantedCount ? '✓' : String(i + 1)}
                  </Text>
                </View>
                {i < 2 && (
                  <View
                    style={[
                      styles.progressLine,
                      i < grantedCount ? styles.progressLineDone : styles.progressLinePending,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
          <Text style={styles.progressLabel}>
            {grantedCount} of {totalCount} granted
          </Text>
        </View>

        {/* Permission cards */}
        <View style={styles.permissionsList}>
          {permissions.map((perm) => {
            const isGranted = status?.[perm.key] === true;
            const isChecking = checkingId === perm.id;

            return (
              <View
                key={perm.id}
                style={[styles.permCard, isGranted && styles.permCardGranted]}
              >
                <View style={styles.permHeader}>
                  <Text style={styles.permIcon}>{perm.icon}</Text>
                  <View style={styles.permInfo}>
                    <View style={styles.permTitleRow}>
                      <Text style={styles.permTitle}>{perm.title}</Text>
                      {isGranted && <Text style={styles.grantedBadge}>✓ Granted</Text>}
                    </View>
                    <Text style={styles.permDesc}>{perm.description}</Text>
                  </View>
                </View>

                {!isGranted && (
                  <>
                    <Text style={styles.permSettingsPath}>{perm.settingsAction}</Text>
                    <TouchableOpacity
                      style={[styles.permButton, isChecking && styles.permButtonChecking]}
                      onPress={() => openPermissionSetting(perm)}
                      disabled={isChecking}
                      activeOpacity={0.7}
                    >
                      {isChecking ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.permButtonText}>Open Settings</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {allGranted ? (
            <TouchableOpacity
              style={[styles.primaryButton, styles.allGrantedButton]}
              onPress={handleContinueToSession}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>✅ All Set — Start Focusing!</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCheckAndContinue}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Check & Continue
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipTimerOnly}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip, just use timer</Text>
              </TouchableOpacity>

              <View style={styles.timerOnlyNote}>
                <Text style={styles.timerOnlyText}>
                  ⏱️ Timer-only mode works great. Your focus session will run
                  without automatic app blocking.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
  checkingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
  headerEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  headerImage: {
    width: 64,
    height: 64,
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
  // Progress indicator
  progressContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotDone: {
    backgroundColor: COLORS.success,
  },
  progressDotPending: {
    backgroundColor: COLORS.border,
  },
  progressDotText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  progressLine: {
    width: 40,
    height: 3,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  progressLineDone: {
    backgroundColor: COLORS.success,
  },
  progressLinePending: {
    backgroundColor: COLORS.border,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  // Permission cards
  permissionsList: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  permCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permCardGranted: {
    borderColor: COLORS.success,
    backgroundColor: '#F1F8E9',
  },
  permHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  permIcon: {
    fontSize: 28,
  },
  permInfo: {
    flex: 1,
  },
  permTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  permTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  grantedBadge: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '700',
  },
  permDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  permSettingsPath: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  permButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    alignSelf: 'flex-start',
    minWidth: 120,
  },
  permButtonChecking: {
    opacity: 0.7,
  },
  permButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  // Actions
  actions: {
    gap: SPACING.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  allGrantedButton: {
    backgroundColor: COLORS.success,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
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
  iosSteps: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginVertical: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  iosStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iosStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  iosStepText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
    lineHeight: 22,
  },
});

export default PermissionGateScreen;