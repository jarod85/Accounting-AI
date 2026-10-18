import {
  CATEGORIES,
  CLAIM_TYPE_LABELS,
  categoriesByClaimType,
  type Category,
} from '@accounting-ai/core';
import { useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SECTIONS = categoriesByClaimType().map(({ claimType, categories }) => ({
  title: CLAIM_TYPE_LABELS[claimType],
  data: categories,
}));

export interface CategoryPickerProps {
  value: Category | '';
  onChange: (category: Category) => void;
  error?: string;
  needsCheck?: boolean;
}

/** A field that opens a full-screen list of ATO categories, grouped by claim type. */
export function CategoryPicker({ value, onChange, error, needsCheck }: CategoryPickerProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const selected = value ? CATEGORIES[value] : null;
  const borderColor = error ? theme.danger : needsCheck ? theme.warning : theme.border;

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">
        Category
        {needsCheck ? (
          <ThemedText type="small" themeColor="warning">
            {' '}
            · please check
          </ThemedText>
        ) : null}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Category"
        accessibilityHint="Opens the list of categories"
        onPress={() => setIsOpen(true)}
        style={[styles.selector, { borderColor }]}>
        <ThemedText>{selected?.label ?? 'Choose a category'}</ThemedText>
        {selected?.taxReturnLabel ? (
          <ThemedText type="small" themeColor="textSecondary">
            {selected.taxReturnLabel}
          </ThemedText>
        ) : null}
      </Pressable>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <ThemedView style={styles.modal}>
          <SafeAreaView style={styles.modal}>
            <SectionList
              sections={SECTIONS}
              keyExtractor={(code) => code}
              contentContainerStyle={styles.list}
              renderSectionHeader={({ section }) => (
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                  {section.title}
                </ThemedText>
              )}
              renderItem={({ item: code }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: code === value }}
                  onPress={() => {
                    onChange(code);
                    setIsOpen(false);
                  }}
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        code === value ? theme.backgroundSelected : theme.backgroundElement,
                    },
                  ]}>
                  <ThemedText type="smallBold">{CATEGORIES[code].label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {CATEGORIES[code].guidance}
                  </ThemedText>
                </Pressable>
              )}
            />
            <View style={styles.footer}>
              <Button label="Cancel" variant="secondary" onPress={() => setIsOpen(false)} />
            </View>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  selector: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modal: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  option: {
    borderRadius: Radius.small,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  footer: {
    padding: Spacing.three,
  },
});
