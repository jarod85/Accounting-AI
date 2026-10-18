/**
 * Reads a receipt with Claude and returns a validated ReceiptExtraction.
 *
 * Every failure (refusal, truncated output, invalid JSON, API error) becomes an
 * `{ ok: false, reason }` outcome with a message the user can act on, so the
 * caller never has to handle exceptions from here.
 */

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { encodeBase64 } from '@std/encoding/base64';

import {
  type IsoDate,
  type ReceiptExtraction,
  ReceiptExtractionSchema,
  type ReceiptMimeType,
  type UserSettings,
} from '../_shared/core/index.ts';
import { buildSystemPrompt, buildUserPrompt } from './prompt.ts';

export const EXTRACTION_MODEL = 'claude-opus-5-5';

/** Receipts are simple: medium effort reads them reliably at a lower cost. */
const EXTRACTION_EFFORT = 'medium';

export interface ReceiptInput {
  file: Uint8Array;
  mimeType: ReceiptMimeType;
  userNote: string | null;
  settings: UserSettings;
  today: IsoDate;
}

/** Stored with each expense so cost and model behaviour can be checked later. */
export interface ExtractionAudit {
  model: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  usedFallbackModel: boolean;
}

export type ExtractionOutcome =
  | { ok: true; extraction: ReceiptExtraction; audit: ExtractionAudit }
  | { ok: false; reason: string; audit: ExtractionAudit | null };

export interface ReceiptExtractor {
  extract(input: ReceiptInput): Promise<ExtractionOutcome>;
}

type MessageParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Beta.Messages.BetaMessage;

/** The one SDK call the extractor makes. Tests pass a fake. */
export type CreateMessage = (params: MessageParams) => Promise<Message>;

export function createAnthropicMessageSender(apiKey: string): CreateMessage {
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 1 });
  return (params) => client.beta.messages.create(params);
}

export function createClaudeExtractor(createMessage: CreateMessage): ReceiptExtractor {
  return {
    async extract(input) {
      let message: Message;
      try {
        message = await createMessage(buildRequest(input));
      } catch (error) {
        return { ok: false, reason: describeApiError(error), audit: null };
      }
      return readExtraction(message);
    },
  };
}

export function buildRequest(input: ReceiptInput): MessageParams {
  return {
    model: EXTRACTION_MODEL,
    max_tokens: 16_000,
    // If a safety classifier wrongly declines a receipt, retry on Anthropic's recommended fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: EXTRACTION_EFFORT,
      format: betaZodOutputFormat(ReceiptExtractionSchema),
    },
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: [
          receiptBlock(input.file, input.mimeType),
          { type: 'text', text: buildUserPrompt(input.settings, input.userNote, input.today) },
        ],
      },
    ],
  };
}

function receiptBlock(
  file: Uint8Array,
  mimeType: ReceiptMimeType,
): Anthropic.Beta.Messages.BetaContentBlockParam {
  const data = encodeBase64(file);
  if (mimeType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: mimeType, data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: mimeType, data } };
}

function readExtraction(message: Message): ExtractionOutcome {
  const audit: ExtractionAudit = {
    model: message.model,
    stopReason: message.stop_reason,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    usedFallbackModel: (message.usage.iterations ?? []).some(
      (iteration) => iteration.type === 'fallback_message',
    ),
  };

  if (message.stop_reason === 'refusal') {
    return {
      ok: false,
      reason: 'The AI could not read this receipt. Please enter the details yourself.',
      audit,
    };
  }
  if (message.stop_reason === 'max_tokens') {
    return { ok: false, reason: 'The AI ran out of room reading this receipt. Try again.', audit };
  }

  const text = message.content.find((block) => block.type === 'text')?.text;
  const parsed = text === undefined ? null : ReceiptExtractionSchema.safeParse(parseJson(text));
  if (!parsed?.success) {
    return { ok: false, reason: 'The AI returned an unreadable answer. Try again.', audit };
  }
  return { ok: true, extraction: parsed.data, audit };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function describeApiError(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) {
    return 'The AI service is busy. Try again in a minute.';
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the AI service. Check your connection and try again.';
  }
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('Anthropic API key was rejected', error);
    return 'The AI service is not set up correctly. Check the server API key.';
  }
  if (error instanceof Anthropic.APIError) {
    console.error('Anthropic API error', error.status, error.message);
    return 'The AI service had a problem. Try again later.';
  }
  console.error('Unexpected error calling Anthropic', error);
  return 'Something went wrong reading this receipt. Try again.';
}
