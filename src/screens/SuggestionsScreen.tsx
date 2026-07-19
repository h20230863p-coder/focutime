import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RootStackParamList,
  InterestCategory,
  OnboardingData,
  Suggestion,
} from '../types';
import { SUGGESTIONS } from '../constants/interests';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { getSubscriptionState } from '../utils/subscription';

type SuggestionsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Suggestions'>;
  route: RouteProp<RootStackParamList, 'Suggestions'>;
};

export default function SuggestionsScreen({
  navigation,
  route,
}: SuggestionsScreenProps) {
  const { sessionCompleted, duration } = route.params;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const sub = await getSubscriptionState();
      setIsPremium(sub.isPremium);

      const onboardingRaw = await AsyncStorage.getItem('onboarding');
      const onboarding: OnboardingData | null = onboardingRaw
        ? JSON.parse(onboardingRaw)
        : null;

      const userInterests: InterestCategory[] = onboarding?.interests || [];

      let allSuggestions: Suggestion[] = [];

      if (sub.isPremium && userInterests.length > 0) {
        // Premium: personalized suggestions based on interests
        userInterests.forEach((interest) => {
          const items = SUGGESTIONS[interest] || [];
          allSuggestions.push(...items);
        });
      } else if (!sub.isPremium) {
        // Free: generic mix (1 per category)
        Object.values(SUGGESTIONS).forEach((items) => {
          allSuggestions.push(...items.slice(0, 1));
        });
      } else {
        // Premium but no interests — show a mix
        Object.values(SUGGESTIONS).forEach((items) => {
          allSuggestions.push(...items.slice(0, 1));
        });
      }

      // Shuffle and take up to 4
      const shuffled = allSuggestions.sort(() => Math.random() - 0.5);
      setSuggestions(shuffled.slice(0, 4));
    } catch (e) {
      console.error('Failed to load suggestions', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    navigation.navigate('TimerSetup');
  };

  const handleViewHistory = () => {
    navigation.navigate('Analytics');
  };

  const handleUpgrade = () => {
    navigation.navigate('Paywall');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {sessionCompleted ? (
            <>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={styles.title}>Amazing Focus!</Text>
              <Text style={styles.subtitle}>
                You stayed focused for {duration} minutes. That's a win!
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.emoji}>💪</Text>
              <Text style={styles.title}>Good Effort!</Text>
              <Text style={styles.subtitle}>
                Every minute of focus counts. Try again next time!
              </Text>
            </>
          )}
        </View>

        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>
            Instead of scrolling, try this:
          </Text>

          <View style={styles.suggestionsList}>
            {suggestions.map((suggestion) => (
              <View key={suggestion.id} style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.categoryIcon}>
                    {getCategoryIcon(suggestion.category)}
                  </Text>
                  <Text style={styles.suggestionTitle}>
                    {suggestion.title}
                  </Text>
                </View>
                <Text style={styles.suggestionDesc}>
                  {suggestion.description}
                </Text>
                <Text style={styles.suggestionAction}>
                  → {suggestion.action}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {!isPremium && (
          <TouchableOpacity
            style={styles.upgradePrompt}
            onPress={handleUpgrade}
            activeOpacity={0.7}
          >
            <Image
            source={require('../../assets/premium/premium_badge.png')}
            style={styles.upgradeBadge}
            resizeMode="contain"
          />
            <View style={styles.upgradeInfo}>
              <Text style={styles.upgradeTitle}>
                Get Personalized Suggestions
              </Text>
              <Text style={styles.upgradeDesc}>
                Upgrade to Premium for suggestions tailored to your interests
              </Text>
            </View>
            <Text style={styles.upgradeArrow}>→</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start Another Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewHistory}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>View My Streak</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getCategoryIcon(category: InterestCategory): string {
  const icons: Record<InterestCategory, string> = {
    fitness: '💪',
    reading: '📚',
    learning: '🧠',
    meditation: '🧘',
    news: '📰',
    skills: '🛠️',
  };
  return icons[category] || '✨';
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
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  emoji: {
    fontSize: 56,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  suggestionsSection: {
    marginBottom: SPACING.lg,
  },
  suggestionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  suggestionsList: {
    gap: SPACING.sm,
  },
  suggestionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  categoryIcon: {
    fontSize: 20,
  },
  suggestionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  suggestionDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  suggestionAction: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
    gap: SPACING.sm,
  },
  upgradeBadge: {
    width: 32,
    height: 32,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: 2,
  },
  upgradeDesc: {
    fontSize: FONT_SIZES.xs,
    color: '#BCAAA4',
    lineHeight: 16,
  },
  upgradeArrow: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.warning,
    fontWeight: '700',
  },
});