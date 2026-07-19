import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList, InterestCategory } from '../types';
import { INTERESTS } from '../constants/interests';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const { width } = Dimensions.get('window');

const DAILY_GOALS = [10, 15, 25, 30, 45, 60];

type OnboardingStep = 'welcome' | 'interests' | 'goals';

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<InterestCategory[]>([]);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(25);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToStep = (nextStep: OnboardingStep) => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(0);
    });
  };

  const toggleInterest = (id: InterestCategory) => {
    setSelectedInterests((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(
      'onboarding',
      JSON.stringify({
        name: name.trim() || undefined,
        interests: selectedInterests,
        dailyGoalMinutes,
        completed: true,
      })
    );
    navigation.replace('TimerSetup');
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(
      'onboarding',
      JSON.stringify({
        name: name.trim() || undefined,
        interests: [],
        completed: true,
      })
    );
    navigation.replace('TimerSetup');
  };

  // Determine which asset images to show per interest
  const getInterestImage = (id: InterestCategory): any | undefined => {
    const imageMap: Record<InterestCategory, any> = {
      fitness: require('../../assets/onboarding/onboarding_fitness.png'),
      reading: require('../../assets/onboarding/onboarding_reading.png'),
      learning: require('../../assets/onboarding/onboarding_studying.png'),
      meditation: require('../../assets/onboarding/onboarding_meditation_v2.png'),
      news: require('../../assets/onboarding/onboarding_news.png'),
      skills: require('../../assets/onboarding/onboarding_skills.png'),
    };
    return imageMap[id];
  };

  const getInterestIconAsset = (id: InterestCategory): any | undefined => {
    const iconMap: Record<string, any> = {
      fitness: require('../../assets/onboarding/fitness_icon.png'),
      reading: require('../../assets/onboarding/reading_icon.png'),
      learning: require('../../assets/onboarding/learning_icon.png'),
      meditation: require('../../assets/onboarding/meditation_icon.png'),
      news: require('../../assets/onboarding/news_icon.png'),
      skills: require('../../assets/onboarding/skills_icon.png'),
    };
    return iconMap[id];
  };

  const renderWelcome = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeImageContainer}>
          <Image
            source={require('../../assets/splash/splash_screen.png')}
            style={styles.welcomeImage}
            resizeMode="cover"
          />
          <View style={styles.welcomeOverlay} />
        </View>

        <View style={styles.welcomeContent}>
          <Text style={styles.appName}>⏱️ FocuTime</Text>
          <Text style={styles.welcomeTitle}>Reclaim your focus time</Text>
          <Text style={styles.welcomeSubtitle}>
            Break the scroll cycle. FocuTime temporarily locks distracting apps
            and suggests productive alternatives tailored to you.
          </Text>

          <View style={styles.nameInputContainer}>
            <Text style={styles.nameLabel}>What's your name?</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={30}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => animateToStep('interests')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip setup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderInterests = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>What do you love doing?</Text>
          <Text style={styles.subtitle}>
            When it's time to focus, we'll suggest productive alternatives
            tailored to your interests. Pick all that apply.
          </Text>
        </View>

        <View style={styles.interestsGrid}>
          {INTERESTS.map((interest) => {
            const isSelected = selectedInterests.includes(interest.id);
            const interestImage = getInterestImage(interest.id);
            const interestIconAsset = getInterestIconAsset(interest.id);

            return (
              <TouchableOpacity
                key={interest.id}
                style={[
                  styles.interestCard,
                  isSelected && styles.interestCardSelected,
                ]}
                onPress={() => toggleInterest(interest.id)}
                activeOpacity={0.7}
              >
                {interestImage ? (
                  <Image
                    source={interestImage}
                    style={styles.interestImage}
                    resizeMode="cover"
                  />
                ) : interestIconAsset ? (
                  <Image
                    source={interestIconAsset}
                    style={styles.interestIconAsset}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.interestIcon}>{interest.icon}</Text>
                )}
                <View style={[
                  styles.interestLabelContainer,
                  interestImage && styles.interestLabelOverlay,
                ]}>
                  <Text
                    style={[
                      styles.interestLabel,
                      isSelected && styles.interestLabelSelected,
                      interestImage && styles.interestLabelLight,
                    ]}
                  >
                    {interest.label}
                  </Text>
                  {!interestImage && (
                    <Text style={styles.interestDesc}>{interest.description}</Text>
                  )}
                </View>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            selectedInterests.length === 0 && styles.buttonDisabled,
          ]}
          onPress={() => animateToStep('goals')}
          disabled={selectedInterests.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            Continue {selectedInterests.length > 0 ? `(${selectedInterests.length} selected)` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  const renderGoals = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>

        <View style={styles.goalContainer}>
          <Text style={styles.emojiLarge}>🎯</Text>
          <Text style={styles.title}>Set your daily goal</Text>
          <Text style={styles.subtitle}>
            How many minutes of focused work do you want to aim for each day?
          </Text>

          <View style={styles.goalDisplay}>
            <Text style={styles.goalValue}>{dailyGoalMinutes}</Text>
            <Text style={styles.goalLabel}>minutes / day</Text>
          </View>

          <View style={styles.goalPresets}>
            {DAILY_GOALS.map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.goalButton,
                  dailyGoalMinutes === mins && styles.goalButtonSelected,
                ]}
                onPress={() => setDailyGoalMinutes(mins)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.goalButtonText,
                    dailyGoalMinutes === mins && styles.goalButtonTextSelected,
                  ]}
                >
                  {mins} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {name.trim() ? `Start Focusing, ${name.trim().split(' ')[0]}! →` : 'Start Focusing →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  return (
    <Animated.View style={{ flex: 1, opacity: 1 }}>
      {step === 'welcome' && renderWelcome()}
      {step === 'interests' && renderInterests()}
      {step === 'goals' && renderGoals()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },
  // Welcome Step
  welcomeContainer: {
    flex: 1,
  },
  welcomeImageContainer: {
    height: 280,
    overflow: 'hidden',
  },
  welcomeImage: {
    width: '100%',
    height: '100%',
  },
  welcomeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  welcomeContent: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  appName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    letterSpacing: 1,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  nameInputContainer: {
    marginBottom: SPACING.lg,
  },
  nameLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  nameInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  // Header
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  // Interests
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  interestCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
    minHeight: 140,
  },
  interestCardSelected: {
    borderColor: COLORS.primary,
  },
  interestImage: {
    width: '100%',
    height: 100,
  },
  interestIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  interestIconAsset: {
    width: 48,
    height: 48,
    alignSelf: 'center',
    marginTop: SPACING.md,
  },
  interestLabelContainer: {
    padding: SPACING.sm,
  },
  interestLabelOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  interestLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  interestLabelLight: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    padding: SPACING.sm,
  },
  interestLabelSelected: {
    color: COLORS.primary,
  },
  interestLabelOverlaySelected: {
    color: '#FFFFFF',
  },
  interestDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // Goals
  goalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
  },
  emojiLarge: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  goalDisplay: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  goalValue: {
    fontSize: FONT_SIZES.hero,
    fontWeight: '800',
    color: COLORS.primary,
  },
  goalLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginTop: -SPACING.xs,
  },
  goalPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  goalButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  goalButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  goalButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  goalButtonTextSelected: {
    color: '#FFFFFF',
  },
  // Shared
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
  },
});