import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/theme';
import OnboardingScreen from '../screens/OnboardingScreen';
import TimerSetupScreen from '../screens/TimerSetupScreen';
import PermissionGateScreen from '../screens/PermissionGateScreen';
import AppSelectionScreen from '../screens/AppSelectionScreen';
import FocusSessionScreen from '../screens/FocusSessionScreen';
import SuggestionsScreen from '../screens/SuggestionsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import PaywallScreen from '../screens/PaywallScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const raw = await AsyncStorage.getItem('onboarding');
      if (raw) {
        const data = JSON.parse(raw);
        setHasOnboarded(data.completed === true);
      }
    } catch (e) {
      console.error('Failed to check onboarding', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={hasOnboarded ? 'TimerSetup' : 'Onboarding'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="TimerSetup" component={TimerSetupScreen} />
        <Stack.Screen name="PermissionGate" component={PermissionGateScreen} />
        <Stack.Screen name="AppSelection" component={AppSelectionScreen} />
        <Stack.Screen
          name="FocusSession"
          component={FocusSessionScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Suggestions" component={SuggestionsScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});