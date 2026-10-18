/**
 * The app's view of the outside world. Screens and hooks only ever talk to
 * these interfaces; `supabase/` holds the real implementations and
 * `test/fake-services.ts` holds in-memory ones for tests. Swapping the backend
 * means writing new adapters, not touching features.
 */

import type {
  Expense,
  ExpenseDetails,
  ExpenseStatus,
  ReceiptMimeType,
  UserSettings,
} from '@accounting-ai/core';

export interface Session {
  userId: string;
  email: string | null;
}

export interface AuthService {
  getSession(): Promise<Session | null>;
  /** Calls `listener` whenever the user signs in or out. Returns an unsubscribe function. */
  onSessionChange(listener: (session: Session | null) => void): () => void;
  /** Emails a 6-digit sign-in code, creating the account on first use. */
  sendSignInCode(email: string): Promise<void>;
  verifySignInCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
}

/** A receipt file on the device, ready to upload. */
export interface LocalReceipt {
  uri: string;
  mimeType: ReceiptMimeType;
}

export interface NewExpense {
  id: string;
  receiptPath: string;
  receiptMimeType: ReceiptMimeType;
  userNote: string | null;
}

export interface ExpenseRepository {
  /** Every expense for the signed-in user, newest first. */
  list(): Promise<Expense[]>;
  get(id: string): Promise<Expense | null>;
  create(expense: NewExpense): Promise<Expense>;
  saveDetails(
    id: string,
    details: ExpenseDetails,
    status: Extract<ExpenseStatus, 'needs_review' | 'confirmed'>,
  ): Promise<Expense>;
  /** Fails for confirmed expenses, which are kept for the ATO's five-year rule. */
  remove(id: string): Promise<void>;
}

export interface ReceiptStorage {
  upload(path: string, receipt: LocalReceipt): Promise<void>;
  /** A short-lived URL for showing the receipt image. */
  getViewUrl(path: string): Promise<string>;
  remove(path: string): Promise<void>;
}

export interface ReadReceiptResult {
  status: Extract<ExpenseStatus, 'needs_review' | 'failed'>;
  failureReason: string | null;
}

/** Asks the server to read a receipt with AI and fill in the expense. */
export interface ReceiptReader {
  read(expenseId: string): Promise<ReadReceiptResult>;
}

export interface SettingsRepository {
  get(): Promise<UserSettings>;
  save(settings: UserSettings): Promise<void>;
}

export interface Services {
  auth: AuthService;
  expenses: ExpenseRepository;
  receipts: ReceiptStorage;
  receiptReader: ReceiptReader;
  settings: SettingsRepository;
}
