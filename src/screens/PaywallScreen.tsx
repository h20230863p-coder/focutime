import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { purchasePremium, PREMIUM_FEATURES } from '../utils/subscription';

type PaywallScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'>;
};

export default function PaywallScreen({ navigation }: PaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    // Simulate purchase delay
    await new Promise((r) => setTimeout(r, 1500));
    const success = await purchasePremium(selectedPlan);
    setPurchasing(false);

    if (success) {
      setPurchaseComplete(true);
    }
  };

  const handleDismiss = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('TimerSetup');
    }
  };

  if (purchaseComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>You're now Premium!</Text>
          <Text style={styles.successSubtitle}>
            Enjoy unlimited focus sessions, personalized suggestions,
            smart scheduling, and more.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start Focusing →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const monthlyPrice = 3.99;
  const yearlyPrice = 29.99;
  const yearlyMonthly = (yearlyPrice / 12).toFixed(2);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Image 
            source={require('../../assets/premium/premium_badge.png')} 
            style={styles.headerImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Upgrade to Premium</Text>
          <Text style={styles.subtitle}>
            Unlock the full FocuTime experience and supercharge your focus.
          </Text>
        </View>

        <Image 
          source={require('../../assets/premium/upgrade_cta_illustration.png')} 
          style={styles.ctaIllustration}
          resizeMode="contain"
        />

        {/* Features */}
        <View style={styles.featuresList}>
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature.id} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.comparisonContainer}>
          <Text style={styles.sectionTitle}>Free vs Premium</Text>
          <Image 
            source={require('../../assets/premium/subscription_comparison.png')} 
            style={styles.comparisonImage}
            resizeMode="contain"
          />
        </View>

        {/* Plan selector */}
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.7}
          >
            <View style={styles.planTop}>
              <Text style={[
                styles.planName,
                selectedPlan === 'monthly' && styles.planNameSelected,
              ]}>
                Monthly
              </Text>
              <Text style={[
                styles.planPrice,
                selectedPlan === 'monthly' && styles.planPriceSelected,
              ]}>
                ${monthlyPrice}
              </Text>
              <Text style={styles.planPeriod}>/ month</Text>
            </View>
            {selectedPlan === 'monthly' && (
              <View style={styles.selectedDot} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.planCard,
              styles.planCardYearly,
              selectedPlan === 'yearly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.7}
          >
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
            <View style={styles.planTop}>
              <Text style={[
                styles.planName,
                selectedPlan === 'yearly' && styles.planNameSelected,
              ]}>
                Yearly
              </Text>
              <Text style={[
                styles.planPrice,
                selectedPlan === 'yearly' && styles.planPriceSelected,
              ]}>
                ${yearlyPrice}
              </Text>
              <Text style={styles.planPeriod}>/ year</Text>
            </View>
            <Text style={styles.planSavings}>
              ${yearlyMonthly}/mo — Save ${((monthlyPrice * 12) - yearlyPrice).toFixed(2)}
            </Text>
            {selectedPlan === 'yearly' && (
              <View style={styles.selectedDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* Purchase button */}
        <TouchableOpacity
          style={[styles.primaryButton, purchasing && styles.buttonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {selectedPlan === 'monthly'
                ? `Subscribe $${monthlyPrice}/mo`
                : `Subscribe $${yearlyPrice}/yr`}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore / keep free */}
        <View style={styles.bottomLinks}>
          <Text style={styles.restoreText}>
            No payment is processed. This is a demo flow.
          </Text>
          <TouchableOpacity onPress={handleDismiss}>
            <Text style={styles.keepFreeText}>Continue with free tier</Text>
          </TouchableOpacity>
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
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  headerImage: {
    width: 80,
    height: 80,
    marginBottom: SPACING.md,
  },
  ctaIllustration: {
    width: '100%',
    height: 200,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
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
  // Features
  featuresList: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  featureRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  comparisonContainer: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  comparisonImage: {
    width: '100%',
    height: 240,
    borderRadius: BORDER_RADIUS.md,
  },
  // Plans
  plansContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  planCardYearly: {
    borderColor: COLORS.warning,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0EFFF',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: SPACING.md,
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestValueText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planTop: {
    alignItems: 'center',
  },
  planName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  planNameSelected: {
    color: COLORS.primary,
  },
  planPrice: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  planPriceSelected: {
    color: COLORS.primary,
  },
  planPeriod: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: -4,
  },
  planSavings: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  selectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Purchase
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  bottomLinks: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  restoreText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  keepFreeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  successEmoji: {
    fontSize: 72,
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
});