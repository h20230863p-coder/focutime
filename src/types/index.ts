export type InterestCategory =
  | 'fitness'
  | 'reading'
  | 'learning'
  | 'meditation'
  | 'news'
  | 'skills';

export interface Interest {
  id: InterestCategory;
  label: string;
  icon: string;
  description: string;
}

export interface OnboardingData {
  interests: InterestCategory[];
  name?: string;
  goal?: string;
  dailyGoalMinutes?: number;
  completed: boolean;
}

export interface FocusSession {
  id: string;
  startTime: number;
  duration: number; // in minutes
  completed: boolean;
  abandoned: boolean;
  date: string; // ISO date string
  distractions?: Record<string, number>; // Record of package names and attempt counts
}

export interface Suggestion {
  id: string;
  category: InterestCategory;
  title: string;
  description: string;
  action: string;
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  autoSchedule: boolean;
  peakDistractionHours: { start: number; end: number };
  isPremium: boolean;
}

export type RootStackParamList = {
  Onboarding: undefined;
  TimerSetup: undefined;
  PermissionGate: undefined;
  AppSelection: undefined;
  FocusSession: { duration: number };
  Suggestions: { sessionCompleted: boolean; duration: number };
  Analytics: undefined;
  Paywall: undefined;
};