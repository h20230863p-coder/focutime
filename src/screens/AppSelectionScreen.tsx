import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import {
  getInstalledApps,
  InstalledApp,
  isNativeBlockerAvailable,
  IOS_BLOCKING_UNAVAILABLE_MESSAGE,
  SUGGESTED_DISTRACTORS,
} from '../native-modules/AppBlocker';
import { getBlockedApps, saveBlockedApps } from '../utils/storage';

type AppSelectionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AppSelection'>;
};

const SUGGESTED_PACKAGES = new Set(SUGGESTED_DISTRACTORS.map((a) => a.package));
const SUGGESTED_LABELS = new Set(
  SUGGESTED_DISTRACTORS.map((a) => a.label.toLowerCase())
);

function isSuggested(app: InstalledApp): boolean {
  if (SUGGESTED_PACKAGES.has(app.package)) return true;
  // Label match catches regional package variants (e.g. TikTok's other ids).
  return SUGGESTED_LABELS.has(app.label.trim().toLowerCase());
}

export default function AppSelectionScreen({
  navigation,
}: AppSelectionScreenProps) {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const nativeAvailable = isNativeBlockerAvailable();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const saved = await getBlockedApps();
      setSelected(saved);

      if (nativeAvailable) {
        const installed = await getInstalledApps();
        setApps(installed);
        setLoadFailed(installed.length === 0);
      }
    } catch (e) {
      console.error('[AppSelection] Failed to load apps', e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const toggle = useCallback((pkg: string) => {
    setSelected((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]
    );
  }, []);

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.label.toLowerCase().includes(q) || a.package.toLowerCase().includes(q)
    );
  }, [apps, query]);

  const suggestedApps = useMemo(() => apps.filter(isSuggested), [apps]);

  const handleSelectAll = () => {
    setSelected(apps.map((a) => a.package));
  };

  const handleClear = () => {
    setSelected([]);
  };

  const handleSelectSuggested = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      suggestedApps.forEach((a) => next.add(a.package));
      return Array.from(next);
    });
  };

  const handleDone = async () => {
    setSaving(true);
    try {
      await saveBlockedApps(selected);
      navigation.goBack();
    } catch (e) {
      console.error('[AppSelection] Failed to save selection', e);
      Alert.alert('Could not save', 'Your selection could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderUnavailable = () => {
    const isIos = Platform.OS === 'ios';
    return (
      <View style={styles.unavailableCard}>
        <Text style={styles.unavailableEmoji}>{isIos ? '🍎' : '🧪'}</Text>
        <Text style={styles.unavailableTitle}>
          {isIos ? 'iOS cannot block apps' : 'App list needs a development build'}
        </Text>
        <Text style={styles.unavailableText}>
          {isIos
            ? IOS_BLOCKING_UNAVAILABLE_MESSAGE
            : 'Expo Go cannot load FocuTime\'s native app blocker, so there is no list of installed apps to show here.\n\nBuild the app once with:\n\n  npx expo run:android\n\nthen open the FocuTime dev build on your phone — the picker will list your apps and blocking will work.'}
        </Text>
      </View>
    );
  };

  const renderRow = ({ item }: { item: InstalledApp }) => {
    const isSelected = selected.includes(item.package);
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => toggle(item.package)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.rowPackage} numberOfLines={1}>
            {item.package}
          </Text>
        </View>
        {isSuggested(item) && <Text style={styles.suggestedTag}>suggested</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Choose apps to block</Text>
          <Text style={styles.subtitle}>
            These apps open a focus reminder instead of their feed while a
            session is running.
          </Text>
        </View>
      </View>

      {!nativeAvailable ? (
        <View style={styles.body}>{renderUnavailable()}</View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Reading installed apps…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.package}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <TextInput
                style={styles.search}
                placeholder="Search apps"
                placeholderTextColor={COLORS.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />

              <View style={styles.quickRow}>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={handleSelectSuggested}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickButtonText}>Select suggested</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={handleSelectAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickButtonText}>Select all</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickButton}
                  onPress={handleClear}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>

              {suggestedApps.length > 0 && (
                <View style={styles.suggestedSection}>
                  <Text style={styles.sectionTitle}>Suggested</Text>
                  <View style={styles.chips}>
                    {suggestedApps.map((app) => {
                      const isSelected = selected.includes(app.package);
                      return (
                        <TouchableOpacity
                          key={app.package}
                          style={[styles.chip, isSelected && styles.chipSelected]}
                          onPress={() => toggle(app.package)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextSelected,
                            ]}
                          >
                            {isSelected ? '✓ ' : ''}
                            {app.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <Text style={styles.sectionTitle}>
                {query.trim() ? 'Results' : 'All apps'} ({filteredApps.length})
              </Text>

              {loadFailed && (
                <Text style={styles.emptyText}>
                  No apps could be read on this device. If this is a development
                  build, check that the FocuTime App Blocker module is included.
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            !loadFailed ? (
              <Text style={styles.emptyText}>
                {query.trim()
                  ? 'No app matches that search.'
                  : 'No installed apps found.'}
              </Text>
            ) : null
          }
        />
      )}

      {nativeAvailable && !loading && (
        <View style={styles.footer}>
          <Text style={styles.footerCount}>
            {selected.length} app{selected.length === 1 ? '' : 's'} selected
          </Text>
          <TouchableOpacity
            style={[styles.doneButton, saving && styles.doneButtonDisabled]}
            onPress={handleDone}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.doneButtonText}>Save selection</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  search: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  quickButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  quickButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  suggestedSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    marginBottom: SPACING.sm,
  },
  rowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F3F2FF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
  },
  rowInfo: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowPackage: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  suggestedTag: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    paddingVertical: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.md,
  },
  footerCount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 4,
    borderRadius: BORDER_RADIUS.lg,
    minWidth: 140,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    opacity: 0.6,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  unavailableCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  unavailableEmoji: {
    fontSize: 40,
  },
  unavailableTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: '#F57F17',
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: FONT_SIZES.sm,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 21,
  },
});
