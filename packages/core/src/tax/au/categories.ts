/**
 * ATO expense categories: the single source of truth for how an expense is
 * classified. The AI prompt, the review form, the list screen and the CSV
 * export all read from this file, so adding a category here adds it everywhere.
 *
 * Labels follow the individual tax return (D1–D10) for employee deductions and
 * the business schedule for sole-trader expenses.
 */

/** Which part of the tax return a category belongs to. */
export const CLAIM_TYPES = [
  'work_related',
  'business',
  'gift_donation',
  'tax_affairs',
  'not_deductible',
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  work_related: 'Work-related (employee)',
  business: 'Side business',
  gift_donation: 'Gifts & donations',
  tax_affairs: 'Managing tax affairs',
  not_deductible: 'Not deductible',
};

export const CATEGORY_CODES = [
  'work_car',
  'work_travel',
  'work_clothing',
  'work_self_education',
  'work_other',
  'business_equipment',
  'business_software',
  'business_supplies',
  'business_phone_internet',
  'business_motor_vehicle',
  'business_travel',
  'business_advertising',
  'business_professional_fees',
  'business_education',
  'business_other',
  'gift_donation',
  'tax_affairs',
  'volunteering',
  'personal',
] as const;
export type Category = (typeof CATEGORY_CODES)[number];

export interface CategoryInfo {
  claimType: ClaimType;
  /** Short name shown in the app. */
  label: string;
  /** Where it goes on the tax return, e.g. "D5". Null when it is not claimed. */
  taxReturnLabel: string | null;
  /** What belongs here, written for both the user and the AI. */
  guidance: string;
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  work_car: {
    claimType: 'work_related',
    label: 'Work car expenses',
    taxReturnLabel: 'D1',
    guidance:
      'Fuel, tolls, parking or car costs for driving in the course of your job (not the normal trip between home and work).',
  },
  work_travel: {
    claimType: 'work_related',
    label: 'Work travel',
    taxReturnLabel: 'D2',
    guidance:
      'Flights, accommodation, meals while away overnight, taxis and public transport for work trips your employer did not pay for.',
  },
  work_clothing: {
    claimType: 'work_related',
    label: 'Work clothing & laundry',
    taxReturnLabel: 'D3',
    guidance:
      'Uniforms with a logo, protective gear (safety boots, hi-vis), occupation-specific clothing and their laundry. Not normal everyday clothes.',
  },
  work_self_education: {
    claimType: 'work_related',
    label: 'Self-education',
    taxReturnLabel: 'D4',
    guidance:
      'Courses, textbooks, conference fees and study materials directly connected to your current job.',
  },
  work_other: {
    claimType: 'work_related',
    label: 'Other work-related expenses',
    taxReturnLabel: 'D5',
    guidance:
      'Tools and equipment for your job (laptops, monitors, cables, keyboards), work phone and internet, home office supplies, union and professional association fees, work subscriptions.',
  },
  business_equipment: {
    claimType: 'business',
    label: 'Business equipment',
    taxReturnLabel: 'Business schedule',
    guidance:
      'Computers, tools, furniture, cameras and other equipment used to run your side business.',
  },
  business_software: {
    claimType: 'business',
    label: 'Business software & subscriptions',
    taxReturnLabel: 'Business schedule',
    guidance:
      'Software licences, cloud services, hosting, domains and subscriptions for the business.',
  },
  business_supplies: {
    claimType: 'business',
    label: 'Business supplies',
    taxReturnLabel: 'Business schedule',
    guidance:
      'Stationery, printing, postage, packaging and other consumables used by the business.',
  },
  business_phone_internet: {
    claimType: 'business',
    label: 'Business phone & internet',
    taxReturnLabel: 'Business schedule',
    guidance: 'Phone plans, internet and data used for the business.',
  },
  business_motor_vehicle: {
    claimType: 'business',
    label: 'Business motor vehicle',
    taxReturnLabel: 'Business schedule',
    guidance: 'Fuel, servicing, tolls and parking for business trips.',
  },
  business_travel: {
    claimType: 'business',
    label: 'Business travel',
    taxReturnLabel: 'Business schedule',
    guidance: 'Flights, accommodation and transport for business trips.',
  },
  business_advertising: {
    claimType: 'business',
    label: 'Advertising & marketing',
    taxReturnLabel: 'Business schedule',
    guidance: 'Ads, promotion, business cards, website design and marketing services.',
  },
  business_professional_fees: {
    claimType: 'business',
    label: 'Professional & contractor fees',
    taxReturnLabel: 'Business schedule',
    guidance: 'Accountants, lawyers, contractors and other professional services for the business.',
  },
  business_education: {
    claimType: 'business',
    label: 'Business training',
    taxReturnLabel: 'Business schedule',
    guidance: 'Courses, books and training that maintain or improve skills used in the business.',
  },
  business_other: {
    claimType: 'business',
    label: 'Other business expenses',
    taxReturnLabel: 'Business schedule',
    guidance: 'Bank fees, insurance, licences and other running costs of the business.',
  },
  gift_donation: {
    claimType: 'gift_donation',
    label: 'Gifts & donations',
    taxReturnLabel: 'D9',
    guidance:
      'Gifts of $2 or more to a deductible gift recipient (DGR) charity, where you received nothing in return. Not raffle tickets, charity dinners or merchandise.',
  },
  tax_affairs: {
    claimType: 'tax_affairs',
    label: 'Managing tax affairs',
    taxReturnLabel: 'D10',
    guidance: 'Tax agent fees, tax software and other costs of managing your tax affairs.',
  },
  volunteering: {
    claimType: 'not_deductible',
    label: 'Volunteering costs',
    taxReturnLabel: null,
    guidance:
      'Out-of-pocket costs while volunteering (travel, fuel, uniforms, supplies). The ATO generally does not allow these as deductions; they are kept for your records.',
  },
  personal: {
    claimType: 'not_deductible',
    label: 'Personal / private',
    taxReturnLabel: null,
    guidance: 'Private or everyday purchases with no connection to earning income.',
  },
};

export function claimTypeOf(category: Category): ClaimType {
  return CATEGORIES[category].claimType;
}

/** Categories grouped by claim type, in display order. */
export function categoriesByClaimType(): { claimType: ClaimType; categories: Category[] }[] {
  return CLAIM_TYPES.map((claimType) => ({
    claimType,
    categories: CATEGORY_CODES.filter((code) => CATEGORIES[code].claimType === claimType),
  }));
}

/** Work-use % only makes sense where private use is possible. */
export function supportsWorkUsePercent(category: Category): boolean {
  const claimType = claimTypeOf(category);
  return claimType === 'work_related' || claimType === 'business';
}
