import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, FocusSession } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { getSubscriptionState } from '../utils/subscription';
import { BLOCKED_APP_NAMES } from '../native-modules/AppBlocker';

type AnalyticsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Analytics'>;
};

export default function AnalyticsScreen({ navigation }: AnalyticsScreenProps) {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const sub = await getSubscriptionState();
      setIsPremium(sub.isPremium);

      const raw = await AsyncStorage.getItem('sessions');
      const allSessions: FocusSession[] = raw ? JSON.parse(raw) : [];
      setSessions(allSessions.sort((a, b) => b.startTime - a.startTime));
    } catch (e) {
      console.error('Failed to load sessions', e);
    } finally {
      setLoading(false);
    }
  };

  const completedSessions = sessions.filter((s) => s.completed);
  const totalFocusMinutes = completedSessions.reduce(
    (sum, s) => sum + s.duration,
    0
  );
  const streak = calculateStreak(completedSessions);
  const completionRate =
    sessions.length > 0
      ? Math.round((completedSessions.length / sessions.length) * 100)
      : 0;

  // Distraction Analytics
  const distractionMap: Record<string, number> = {};
  let totalDistractions = 0;

  sessions.forEach((session) => {
    if (session.distractions) {
      Object.entries(session.distractions).forEach(([pkg, count]) => {
        distractionMap[pkg] = (distractionMap[pkg] || 0) + count;
        totalDistractions += count;
      });
    }
  });

  const sortedDistractions = Object.entries(distractionMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const mostBlockedApp = sortedDistractions.length > 0
    ? BLOCKED_APP_NAMES[sortedDistractions[0][0]] || sortedDistractions[0][0]
    : 'None';

  // Weekly Trend
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const trendData = last7Days.map(date => {
    const daySessions = sessions.filter(s => s.date === date);
    const dayDistractions = daySessions.reduce((sum, s) => {
      return sum + (s.distractions ? Object.values(s.distractions).reduce((a, b) => a + b, 0) : 0);
    }, 0);
    return { date, count: dayDistractions };
  });

  const maxTrendCount = Math.max(...trendData.map(d => d.count), 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Your Progress</Text>

        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Image 
              source={require('../../assets/placeholders/stats_empty_state.png')}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first focus session to start tracking your streak!
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.streakCard}>
                <Image
                  source={require('../../assets/placeholders/streak_flame.png')}
                  style={styles.streakFlame}
                  resizeMode="contain"
                />
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>
                  {streak === 1 ? 'Day Streak' : 'Day Streak'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{completedSessions.length}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalFocusMinutes}</Text>
                <Text style={styles.statLabel}>Min Focused</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{completionRate}%</Text>
                <Text style={styles.statLabel}>Completion</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalDistractions}</Text>
                <Text style={styles.statLabel}>Blocked</Text>
              </View>
            </View>

            {!isPremium && (
              <TouchableOpacity
                style={styles.upgradeCardAnalytics}
                onPress={() => navigation.navigate('Paywall')}
                activeOpacity={0.7}
              >
                <Text style={styles.upgradeCardEmoji}>⭐</Text>
                <Text style={styles.upgradeCardTitle}>Unlock Detailed Analytics</Text>
                <Text style={styles.upgradeCardDesc}>
                  Get distraction breakdowns, trends, and deeper insights with Premium.
                </Text>
                <Text style={styles.upgradeCardCTA}>Upgrade →</Text>
              </TouchableOpacity>
            )}

            {isPremium && sortedDistractions.length > 0 && (
              <View style={styles.distractionSection}>
                <Text style={styles.sectionTitle}>Top Distractions</Text>
                <View style={styles.mostBlockedCard}>
                  <View>
                    <Text style={styles.mostBlockedLabel}>Most Blocked</Text>
                    <Text style={styles.mostBlockedValue}>{mostBlockedApp}</Text>
                  </View>
                  <View style={styles.mostBlockedIconContainer}>
                    <Image 
                      source={require('../../assets/placeholders/distraction_shield.png')}
                      style={styles.shieldIcon}
                    />
                  </View>
                </View>
                {sortedDistractions.map(([pkg, count]) => (
                  <View key={pkg} style={styles.distractionRow}>
                    <View style={styles.distractionHeader}>
                      <Text style={styles.distractionName}>
                        {BLOCKED_APP_NAMES[pkg] || pkg.split('.').pop()}
                      </Text>
                      <Text style={styles.distractionCount}>{count} attempts</Text>
                    </View>
                    <View style={styles.distractionBarContainer}>
                      <View 
                        style={[
                          styles.distractionBar, 
                          { width: `${Math.max(5, (count / sortedDistractions[0][1]) * 100)}%` }
                        ]} 
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.trendSection}>
              <Text style={styles.sectionTitle}>Distraction Trends (Last 7 Days)</Text>
              <View style={styles.trendChart}>
                {trendData.map((item, index) => (
                  <View key={item.date} style={styles.trendColumn}>
                    <View 
                      style={[
                        styles.trendBar, 
                        { height: `${(item.count / maxTrendCount) * 100}%` }
                      ]} 
                    />
                    <Text style={styles.trendLabel}>
                      {new Date(item.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              {sessions.slice(0, 5).map((session) => (
                <View key={session.id} style={styles.sessionRow}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDuration}>
                      {session.duration} min
                    </Text>
                    <Text style={styles.sessionDate}>
                      {new Date(session.startTime).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.sessionBadge,
                      session.completed
                        ? styles.badgeCompleted
                        : styles.badgeAbandoned,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        session.completed
                          ? styles.badgeTextCompleted
                          : styles.badgeTextAbandoned,
                      ]}
                    >
                      {session.completed ? '✓ Done' : '✕ Abandoned'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('TimerSetup')}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Back to Timer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function calculateStreak(sessions: FocusSession[]): number {
  if (sessions.length === 0) return 0;

  const uniqueDays = new Set<string>();
  sessions.forEach((s) => {
    const dateStr = new Date(s.startTime).toISOString().split('T')[0];
    uniqueDays.add(dateStr);
  });

  const sortedDays = Array.from(uniqueDays).sort().reverse();

  if (sortedDays.length === 0) return 0;

  let streak = 1;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split('T')[0];

  // Only count streak if the latest session is today or yesterday
  if (sortedDays[0] !== today && sortedDays[0] !== yesterday) {
    return 0;
  }

  for (let i = 0; i < sortedDays.length - 1; i++) {
    const current = new Date(sortedDays[i]);
    const previous = new Date(sortedDays[i + 1]);
    const diffDays =
      (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
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
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  screenTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streakCard: {
    width: '48%',
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  streakFlame: {
    width: 32,
    height: 32,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  recentSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDuration: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  sessionDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sessionBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeCompleted: {
    backgroundColor: '#E8F5E9',
  },
  badgeAbandoned: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  badgeTextCompleted: {
    color: COLORS.success,
  },
  badgeTextAbandoned: {
    color: COLORS.error,
  },
  distractionSection: {
    marginBottom: SPACING.lg,
  },
  mostBlockedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mostBlockedLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  mostBlockedValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  mostBlockedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 111, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shieldIcon: {
    width: 32,
    height: 32,
  },
  distractionRow: {
    marginBottom: SPACING.md,
  },
  distractionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  distractionName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  distractionBarContainer: {
    height: 8,
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  distractionBar: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
  },
  distractionCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  trendSection: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  trendColumn: {
    alignItems: 'center',
    width: '12%',
  },
  trendBar: {
    width: '60%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    minHeight: 2,
  },
  trendLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  upgradeCardAnalytics: {
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.warning,
    marginBottom: SPACING.lg,
  },
  upgradeCardEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  upgradeCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: SPACING.xs,
  },
  upgradeCardDesc: {
    fontSize: FONT_SIZES.sm,
    color: '#BCAAA4',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  upgradeCardCTA: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
});