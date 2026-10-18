/**
 * The user's tax situation. It gives the AI context ("I'm a nurse with a
 * photography side business") and switches GST rules on or off.
 */

import type { TaxProfile } from './tax/au/assess.ts';

export interface UserSettings extends TaxProfile {
  /** The salaried job, e.g. "Software engineer". */
  occupation: string;
  /** What the side business does, e.g. "Freelance wedding photography". */
  businessDescription: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  occupation: '',
  businessDescription: '',
  gstRegistered: false,
};
