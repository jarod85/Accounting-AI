/**
 * Australian Business Number (ABN) helpers.
 *
 * An ABN is 11 digits with a built-in checksum. The ATO publishes the check:
 * subtract 1 from the first digit, multiply each digit by its weight, and the
 * total must divide evenly by 89.
 */

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

/** Strips spaces and other separators: "51 824 753 556" -> "51824753556". */
export function normalizeAbn(value: string): string {
  return value.replace(/\D/g, '');
}

/** True when `value` (with or without spaces) is a valid ABN. */
export function isValidAbn(value: string): boolean {
  const digits = normalizeAbn(value);
  if (digits.length !== ABN_WEIGHTS.length) {
    return false;
  }
  const total = ABN_WEIGHTS.reduce((sum, weight, index) => {
    const digit = Number(digits[index]) - (index === 0 ? 1 : 0);
    return sum + digit * weight;
  }, 0);
  return total % 89 === 0;
}

/** Formats an ABN the way it is printed on invoices: "51 824 753 556". */
export function formatAbn(value: string): string {
  const digits = normalizeAbn(value);
  if (digits.length !== ABN_WEIGHTS.length) {
    return value;
  }
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}
