/**
 * Australian financial year helpers.
 *
 * The Australian financial (income) year runs from 1 July to 30 June. We name a
 * financial year by the calendar year it ends in, the same way the ATO does:
 * financial year 2027 is 1 July 2026 – 30 June 2027, shown as "2026–27".
 */

/** A calendar date as an ISO string, e.g. "2026-10-18". Never includes a time. */
export type IsoDate = string;

/** A financial year, named by the year it ends in (2027 = 2026–27). */
export type FinancialYear = number;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True when `value` is a real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Shows a date the way Australians write it: "2026-08-15" -> "15/08/2026". */
export function formatAustralianDate(date: IsoDate): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

/** Reads a day-first date such as "15/08/2026" or "5/8/2026". Returns null if it is not a real date. */
export function parseAustralianDate(text: string): IsoDate | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const [, day = '', month = '', year = ''] = match;
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : null;
}

/** Converts a JS Date to an IsoDate using the device's local calendar date. */
export function toIsoDate(date: Date): IsoDate {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Returns the financial year a date falls in, e.g. "2026-07-01" -> 2027. */
export function financialYearOf(date: IsoDate): FinancialYear {
  if (!isIsoDate(date)) {
    throw new Error(`Not a valid ISO date: "${date}"`);
  }
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const JULY = 7;
  return month >= JULY ? year + 1 : year;
}

/** The first and last day of a financial year, e.g. 2027 -> 2026-07-01 .. 2027-06-30. */
export function financialYearRange(financialYear: FinancialYear): { start: IsoDate; end: IsoDate } {
  return { start: `${financialYear - 1}-07-01`, end: `${financialYear}-06-30` };
}

/** Human label for a financial year, e.g. 2027 -> "2026–27". */
export function formatFinancialYear(financialYear: FinancialYear): string {
  const endYearShort = (financialYear % 100).toString().padStart(2, '0');
  return `${financialYear - 1}–${endYearShort}`;
}

/** The financial year that `today` falls in. */
export function currentFinancialYear(today: Date = new Date()): FinancialYear {
  return financialYearOf(toIsoDate(today));
}
