/**
 * Money helpers.
 *
 * Every amount in the app is an integer number of cents. Floating-point dollars
 * (0.1 + 0.2 !== 0.3) are only used at the edges: parsing what the user types
 * and formatting what they see.
 */

/** An amount of money in whole cents, e.g. 1999 means $19.99. */
export type Cents = number;

/** Returns `percent`% of `cents`, rounded to the nearest cent. */
export function applyPercent(cents: Cents, percent: number): Cents {
  return Math.round((cents * percent) / 100);
}

/** Formats cents as Australian dollars, e.g. 123456 -> "$1,234.56". */
export function formatAud(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const groupedDollars = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${groupedDollars}.${remainder.toString().padStart(2, '0')}`;
}

/** Formats cents as a plain decimal string without symbols, e.g. 123456 -> "1234.56". */
export function formatDecimal(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${(absolute % 100).toString().padStart(2, '0')}`;
}

/**
 * Parses a dollar amount typed by the user into cents.
 * Accepts "12", "12.5", "12.50", "$1,234.56". Returns null for anything else
 * (including negative numbers and more than two decimal places).
 */
export function parseDollarsInput(text: string): Cents | null {
  const cleaned = text.trim().replace(/^\$/, '').replace(/,/g, '');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    return null;
  }
  const [, wholeDollars = '0', fraction = ''] = match;
  return Number(wholeDollars) * 100 + Number(fraction.padEnd(2, '0'));
}
