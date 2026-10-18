/** Fakes shared by this function's tests. */

import type Anthropic from '@anthropic-ai/sdk';

import type { ReceiptExtraction } from '../_shared/core/index.ts';
import type { CreateMessage } from './claude-extractor.ts';

type Message = Anthropic.Beta.Messages.BetaMessage;
type MessageParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

/** A Claude reply whose text block is `extraction` as JSON. Only the fields the extractor reads are real. */
export function fakeMessage(
  extraction: ReceiptExtraction | string,
  overrides: { stopReason?: string; usedFallback?: boolean } = {},
): Message {
  const text = typeof extraction === 'string' ? extraction : JSON.stringify(extraction);
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text, citations: null },
    ],
    stop_reason: overrides.stopReason ?? 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 1_800,
      output_tokens: 600,
      iterations: overrides.usedFallback ? [{ type: 'fallback_message' }] : null,
    },
  } as unknown as Message;
}

/** Records every request and replies with `reply` (or throws it, if it is an Error). */
export function recordingSender(reply: Message | Error): {
  send: CreateMessage;
  requests: MessageParams[];
} {
  const requests: MessageParams[] = [];
  return {
    requests,
    send: (params) => {
      requests.push(params);
      return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply);
    },
  };
}
