/**
 * Supabase implementations of every port. Each one is a thin translation layer:
 * no business rules live here.
 */

import { DEFAULT_USER_SETTINGS } from '@accounting-ai/core';
import {
  FunctionsHttpError,
  type Session as SupabaseSession,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { File } from 'expo-file-system';

import type {
  AuthService,
  ExpenseRepository,
  ReceiptReader,
  ReceiptStorage,
  Services,
  Session,
  SettingsRepository,
} from '@/services/ports';
import {
  detailsToRow,
  EXPENSE_COLUMNS,
  expenseFromRow,
  type ExpenseRow,
} from '@/services/supabase/expense-mapping';

const RECEIPTS_BUCKET = 'receipts';
const VIEW_URL_LIFETIME_SECONDS = 60 * 10;

export function createSupabaseServices(client: SupabaseClient): Services {
  return {
    auth: createAuthService(client),
    expenses: createExpenseRepository(client),
    receipts: createReceiptStorage(client),
    receiptReader: createReceiptReader(client),
    settings: createSettingsRepository(client),
  };
}

function toSession(session: SupabaseSession | null): Session | null {
  return session ? { userId: session.user.id, email: session.user.email ?? null } : null;
}

function createAuthService(client: SupabaseClient): AuthService {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return toSession(data.session);
    },
    onSessionChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        listener(toSession(session)),
      );
      return () => data.subscription.unsubscribe();
    },
    async sendSignInCode(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
    },
    async verifySignInCode(email, code) {
      const { error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
  };
}

function createExpenseRepository(client: SupabaseClient): ExpenseRepository {
  const expenses = () => client.from('expenses');

  return {
    async list() {
      const { data, error } = await expenses()
        .select(EXPENSE_COLUMNS)
        .order('created_at', { ascending: false })
        .returns<ExpenseRow[]>();
      if (error) throw error;
      return data.map(expenseFromRow);
    },
    async get(id) {
      const { data, error } = await expenses()
        .select(EXPENSE_COLUMNS)
        .eq('id', id)
        .returns<ExpenseRow[]>()
        .maybeSingle();
      if (error) throw error;
      return data ? expenseFromRow(data) : null;
    },
    async create(expense) {
      const { data, error } = await expenses()
        .insert({
          id: expense.id,
          receipt_path: expense.receiptPath,
          receipt_mime_type: expense.receiptMimeType,
          user_note: expense.userNote,
        })
        .select(EXPENSE_COLUMNS)
        .returns<ExpenseRow[]>()
        .single();
      if (error) throw error;
      return expenseFromRow(data);
    },
    async saveDetails(id, details, status) {
      const { data, error } = await expenses()
        .update({ ...detailsToRow(details), status })
        .eq('id', id)
        .select(EXPENSE_COLUMNS)
        .returns<ExpenseRow[]>()
        .single();
      if (error) throw error;
      return expenseFromRow(data);
    },
    async remove(id) {
      const { data, error } = await expenses().delete().eq('id', id).select('id');
      if (error) throw error;
      if (data.length === 0) {
        throw new Error('Confirmed expenses are kept for your records and cannot be deleted.');
      }
    },
  };
}

function createReceiptStorage(client: SupabaseClient): ReceiptStorage {
  const bucket = () => client.storage.from(RECEIPTS_BUCKET);

  return {
    async upload(path, receipt) {
      // React Native has no reliable Blob upload, so send the raw bytes.
      const bytes = await new File(receipt.uri).arrayBuffer();
      const { error } = await bucket().upload(path, bytes, {
        contentType: receipt.mimeType,
        upsert: false,
      });
      if (error) throw error;
    },
    async getViewUrl(path) {
      const { data, error } = await bucket().createSignedUrl(path, VIEW_URL_LIFETIME_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
    async remove(path) {
      const { error } = await bucket().remove([path]);
      if (error) throw error;
    },
  };
}

function createReceiptReader(client: SupabaseClient): ReceiptReader {
  return {
    async read(expenseId) {
      const { data, error } = await client.functions.invoke('extract-receipt', {
        body: { expenseId },
      });
      if (error) {
        throw new Error(await functionErrorMessage(error));
      }
      return data;
    },
  };
}

/** The Edge Function replies with { error: "..." } on failure; surface that message. */
async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await (error.context as Response).json().catch(() => null);
    if (typeof body?.error === 'string') {
      return body.error;
    }
  }
  return 'Could not reach the server to read the receipt. Try again.';
}

function createSettingsRepository(client: SupabaseClient): SettingsRepository {
  return {
    async get() {
      const { data, error } = await client
        .from('user_settings')
        .select('occupation, business_description, gst_registered')
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_USER_SETTINGS;
      return {
        occupation: data.occupation,
        businessDescription: data.business_description,
        gstRegistered: data.gst_registered,
      };
    },
    async save(settings) {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      const { error } = await client.from('user_settings').upsert({
        user_id: userData.user.id,
        occupation: settings.occupation,
        business_description: settings.businessDescription,
        gst_registered: settings.gstRegistered,
      });
      if (error) throw error;
    },
  };
}
