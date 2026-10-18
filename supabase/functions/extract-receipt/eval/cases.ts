/**
 * Eval cases: synthetic receipts (fictional businesses) with the answer we expect.
 * Each one targets a rule the AI must get right.
 */

import type { Category, IsoDate, UserSettings } from '../../_shared/core/index.ts';

export interface EvalExpectation {
  category: Category;
  totalCents: number;
  purchaseDate: IsoDate;
  isAsset: boolean;
  /** When set, the suggested work-use % must be below this. */
  workUseBelow?: number;
}

export interface EvalCase {
  name: string;
  receiptLines: string[];
  userNote: string | null;
  settings: UserSettings;
  expected: EvalExpectation;
}

const EMPLOYEE_WITH_PHOTOGRAPHY_BUSINESS: UserSettings = {
  occupation: 'Software engineer',
  businessDescription: 'Weekend wedding photography',
  gstRegistered: false,
};

export const EVAL_CASES: EvalCase[] = [
  {
    name: 'USB-C cable for work',
    receiptLines: [
      'SOUTHERN CROSS COMPUTER SUPPLIES',
      '12 Example St, Melbourne VIC 3000',
      'TAX INVOICE   15/08/2026 10:42',
      '',
      'USB-C to USB-C cable 2m        $24.95',
      '',
      'TOTAL                          $24.95',
      'Includes GST                    $2.27',
      'EFTPOS  Approved',
    ],
    userNote: 'cable to plug my work laptop into the office monitor',
    settings: EMPLOYEE_WITH_PHOTOGRAPHY_BUSINESS,
    expected: {
      category: 'work_other',
      totalCents: 2495,
      purchaseDate: '2026-08-15',
      isAsset: true,
    },
  },
  {
    name: 'Laptop with private use, day-first date',
    receiptLines: [
      'HARBOUR ELECTRONICS',
      'Receipt   03/07/2026',
      '',
      '14" Laptop 16GB / 512GB      $1,899.00',
      '',
      'TOTAL (incl. GST)             $1,899.00',
      'GST                             $172.64',
    ],
    userNote: 'new laptop, mostly for my job but I use it at home too',
    settings: EMPLOYEE_WITH_PHOTOGRAPHY_BUSINESS,
    expected: {
      category: 'work_other',
      totalCents: 189900,
      purchaseDate: '2026-07-03',
      isAsset: true,
      workUseBelow: 100,
    },
  },
  {
    name: 'Donation to a charity',
    receiptLines: [
      'COASTAL ANIMAL RESCUE INC.',
      'Donation receipt',
      'Date: 01/09/2026',
      'Received with thanks the sum of $50.00',
      'as a donation. No goods or services were provided.',
      'Donations of $2 or more are tax deductible.',
    ],
    userNote: null,
    settings: EMPLOYEE_WITH_PHOTOGRAPHY_BUSINESS,
    expected: {
      category: 'gift_donation',
      totalCents: 5000,
      purchaseDate: '2026-09-01',
      isAsset: false,
    },
  },
  {
    name: 'Fuel while volunteering',
    receiptLines: [
      'BAYSIDE FUEL',
      '12/09/2026  16:05   Pump 4',
      'Unleaded 91   34.20L @ 182.5    $62.42',
      'TOTAL                           $62.42',
      'GST included                     $5.67',
    ],
    userNote: 'drove to volunteer at the community food bank',
    settings: EMPLOYEE_WITH_PHOTOGRAPHY_BUSINESS,
    expected: {
      category: 'volunteering',
      totalCents: 6242,
      purchaseDate: '2026-09-12',
      isAsset: false,
    },
  },
  {
    name: 'Software subscription for the side business',
    receiptLines: [
      'PIXEL CLOUD PTY LTD',
      'Tax invoice  INV-20931   Issued 20/09/2026',
      'Photo editing plan - monthly       $16.49',
      'Total AUD (incl. GST $1.50)        $16.49',
    ],
    userNote: 'editing software for my photography business',
    settings: EMPLOYEE_WITH_PHOTOGRAPHY_BUSINESS,
    expected: {
      category: 'business_software',
      totalCents: 1649,
      purchaseDate: '2026-09-20',
      isAsset: false,
    },
  },
  {
    name: 'Groceries',
    receiptLines: [
      'FRESH MARKET',
      '05/10/2026',
      'Bananas 1kg      $3.90',
      'Milk 2L          $3.30',
      'Bread            $4.50',
      'Coffee beans    $11.00',
      'TOTAL           $22.70',
    ],
    userNote: null,
    settings: EMPLOYEE_WITH_PHOTOGRAPHY_BUSINESS,
    expected: {
      category: 'personal',
      totalCents: 2270,
      purchaseDate: '2026-10-05',
      isAsset: false,
    },
  },
];
