import {
  CATEGORIES,
  formatAud,
  supportsWorkUsePercent,
  type Expense,
  type ExpenseDetails,
  type ReviewableField,
  type TaxProfile,
} from '@accounting-ai/core';
import { Controller, useForm, useWatch, type Control, type Resolver } from 'react-hook-form';
import { StyleSheet, Switch, View, type TextInputProps } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { CategoryPicker } from './category-picker';
import {
  parseFormValues,
  previewAssessment,
  toFormValues,
  type ExpenseFormValues,
} from './expense-form-values';
import { FlagList } from './flag-list';

export interface ExpenseFormProps {
  expense: Expense;
  profile: TaxProfile;
  isSaving: boolean;
  /** `confirm` is true when the user has finished checking the expense. */
  onSave: (details: ExpenseDetails, confirm: boolean) => void;
}

const METHOD_TEXT = {
  immediate: 'claimed this financial year',
  depreciate: 'claimed over several years (depreciation)',
  none: 'not deductible',
} as const;

export function ExpenseForm({ expense, profile, isSaving, onSave }: ExpenseFormProps) {
  const resolver: Resolver<ExpenseFormValues, unknown, ExpenseDetails> = (values) => {
    const parsed = parseFormValues(values, expense.currency);
    if (parsed.ok) {
      return { values: parsed.details, errors: {} };
    }
    const errors = Object.fromEntries(
      Object.entries(parsed.errors).map(([field, message]) => [
        field,
        { type: 'validate', message },
      ]),
    );
    return { values: {}, errors };
  };

  const { control, handleSubmit } = useForm<ExpenseFormValues, unknown, ExpenseDetails>({
    defaultValues: toFormValues(expense),
    resolver,
  });
  const values = useWatch({ control }) as ExpenseFormValues;
  const submit = (confirm: boolean) => () =>
    void handleSubmit((details) => onSave(details, confirm))();
  const assessment = previewAssessment(values, expense.currency, profile);
  const needsCheck = (field: ReviewableField) => expense.lowConfidenceFields.includes(field);
  const isConfirmed = expense.status === 'confirmed';

  return (
    <View style={styles.form}>
      <FormTextField
        control={control}
        name="merchantName"
        label="Supplier"
        needsCheck={needsCheck('merchantName')}
      />
      <FormTextField
        control={control}
        name="purchaseDate"
        label="Date"
        placeholder="DD/MM/YYYY"
        keyboardType="numbers-and-punctuation"
        needsCheck={needsCheck('purchaseDate')}
      />
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <FormTextField
            control={control}
            name="total"
            label="Total paid ($)"
            keyboardType="decimal-pad"
            needsCheck={needsCheck('totalCents')}
          />
        </View>
        <View style={styles.rowItem}>
          <FormTextField control={control} name="gst" label="GST ($)" keyboardType="decimal-pad" />
        </View>
      </View>

      <Controller
        control={control}
        name="category"
        render={({ field, fieldState }) => (
          <CategoryPicker
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            needsCheck={needsCheck('category')}
          />
        )}
      />

      {values.category && supportsWorkUsePercent(values.category) ? (
        <FormTextField
          control={control}
          name="workUsePercent"
          label="Work or business use (%)"
          hint="Only this share is claimable. 100 if you never use it privately."
          keyboardType="number-pad"
        />
      ) : null}

      <Controller
        control={control}
        name="isAsset"
        render={({ field }) => (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="smallBold">Equipment that lasts more than a year</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Laptops, tools, furniture. Dearer items are claimed over several years.
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel="Equipment that lasts more than a year"
              value={field.value}
              onValueChange={field.onChange}
            />
          </View>
        )}
      />

      <FormTextField
        control={control}
        name="description"
        label="Description"
        hint="What you bought and how it relates to earning your income."
        multiline
      />
      <FormTextField
        control={control}
        name="merchantAbn"
        label="Supplier ABN (optional)"
        keyboardType="number-pad"
      />
      <FormTextField control={control} name="userNote" label="Your notes (optional)" multiline />

      <Card accessibilityLabel="Deduction summary">
        <ThemedText type="smallBold">
          {assessment.claimableCents > 0
            ? `Deductible: ${formatAud(assessment.claimableCents)}, ${METHOD_TEXT[assessment.method]}`
            : 'Not deductible'}
        </ThemedText>
        {values.category ? (
          <ThemedText type="small" themeColor="textSecondary">
            {CATEGORIES[values.category].taxReturnLabel
              ? `Tax return label ${CATEGORIES[values.category].taxReturnLabel}`
              : 'Kept for your records only'}
          </ThemedText>
        ) : null}
        <FlagList flags={assessment.flags} />
      </Card>

      {isConfirmed ? (
        <Button label="Save changes" isLoading={isSaving} onPress={submit(true)} />
      ) : (
        <>
          <Button label="Confirm expense" isLoading={isSaving} onPress={submit(true)} />
          <Button
            label="Save for later"
            variant="secondary"
            disabled={isSaving}
            onPress={submit(false)}
          />
        </>
      )}
    </View>
  );
}

type FormTextFieldProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  control: Control<ExpenseFormValues, unknown, ExpenseDetails>;
  name: Exclude<keyof ExpenseFormValues, 'isAsset' | 'category'>;
  label: string;
  hint?: string;
  needsCheck?: boolean;
};

/** A TextField wired to the form. */
function FormTextField({ control, name, ...fieldProps }: FormTextFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...fieldProps}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowItem: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
    gap: Spacing.half,
  },
});
