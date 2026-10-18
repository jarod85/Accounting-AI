/**
 * ExpenseStore backed by Supabase. The client is created with the caller's JWT,
 * so every query and download runs as that user and row level security applies.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ExpenseStore, ExtractionResult, SignedInUser, StoredReceipt } from './handler.ts';

export function createSupabaseAuthenticator(supabaseUrl: string, anonKey: string) {
  return async (authorizationHeader: string): Promise<SignedInUser | null> => {
    const token = authorizationHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return null;
    }
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return { email: data.user.email ?? null, store: createSupabaseExpenseStore(client) };
  };
}

export function createSupabaseExpenseStore(client: SupabaseClient): ExpenseStore {
  return {
    async findExpense(expenseId) {
      const { data, error } = await client
        .from('expenses')
        .select('id, status, receipt_path, receipt_mime_type, user_note')
        .eq('id', expenseId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        return null;
      }
      const receipt: StoredReceipt = {
        id: data.id,
        status: data.status,
        receiptPath: data.receipt_path,
        receiptMimeType: data.receipt_mime_type,
        userNote: data.user_note,
      };
      return receipt;
    },

    async findSettings() {
      const { data, error } = await client
        .from('user_settings')
        .select('occupation, business_description, gst_registered')
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data
        ? {
          occupation: data.occupation,
          businessDescription: data.business_description,
          gstRegistered: data.gst_registered,
        }
        : null;
    },

    async downloadReceipt(receiptPath) {
      const { data, error } = await client.storage.from('receipts').download(receiptPath);
      if (error) {
        throw error;
      }
      return new Uint8Array(await data.arrayBuffer());
    },

    async saveResult(expenseId, result) {
      const { error } = await client.from('expenses').update(toRow(result)).eq('id', expenseId);
      if (error) {
        throw error;
      }
    },
  };
}

function toRow(result: ExtractionResult) {
  if (result.status === 'failed') {
    return { status: 'failed', failure_reason: result.failureReason, extraction: result.audit };
  }
  const { fields, audit } = result;
  return {
    status: 'needs_review',
    failure_reason: null,
    merchant_name: fields.merchantName,
    merchant_abn: fields.merchantAbn,
    purchase_date: fields.purchaseDate,
    total_cents: fields.totalCents,
    gst_cents: fields.gstCents,
    currency: fields.currency,
    category: fields.category,
    work_use_percent: fields.workUsePercent,
    is_asset: fields.isAsset,
    description: fields.description,
    ai_rationale: fields.aiRationale,
    low_confidence_fields: fields.lowConfidenceFields,
    extraction: { ...audit, fields },
  };
}
