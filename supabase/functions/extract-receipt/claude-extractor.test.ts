import Anthropic from '@anthropic-ai/sdk';
import { assert, assertEquals, assertObjectMatch } from '@std/assert';

import { DEFAULT_USER_SETTINGS } from '../_shared/core/index.ts';
import { makeExtraction } from '../_shared/core/testing.ts';
import {
  buildRequest,
  createClaudeExtractor,
  EXTRACTION_MODEL,
  type ReceiptInput,
} from './claude-extractor.ts';
import { fakeMessage, recordingSender } from './test-helpers.ts';

const JPEG_INPUT: ReceiptInput = {
  file: new Uint8Array([0xff, 0xd8, 0xff]),
  mimeType: 'image/jpeg',
  userNote: 'for my work monitor',
  settings: DEFAULT_USER_SETTINGS,
  today: '2026-10-18',
};

Deno.test('builds a structured-output request with the image first', () => {
  const request = buildRequest(JPEG_INPUT);

  assertEquals(request.model, EXTRACTION_MODEL);
  assertEquals(request.fallbacks, 'default');
  assertEquals(request.betas, ['server-side-fallback-2026-07-01']);
  assertEquals(request.output_config?.effort, 'medium');
  assertEquals(request.output_config?.format?.type, 'json_schema');
  assertEquals(request.thinking, undefined, 'thinking is left to the model (adaptive)');

  const content = request.messages[0]?.content;
  assert(Array.isArray(content));
  assertObjectMatch(content[0] as object, {
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: '/9j/' },
  });
  assertObjectMatch(content[1] as object, { type: 'text' });
});

Deno.test('sends PDFs as a document block', () => {
  const request = buildRequest({ ...JPEG_INPUT, mimeType: 'application/pdf' });
  const content = request.messages[0]?.content;
  assert(Array.isArray(content));
  assertObjectMatch(content[0] as object, {
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf' },
  });
});

Deno.test('returns the validated extraction and an audit record', async () => {
  const sender = recordingSender(fakeMessage(makeExtraction()));

  const outcome = await createClaudeExtractor(sender.send).extract(JPEG_INPUT);

  assertEquals(sender.requests.length, 1);
  assertEquals(outcome, {
    ok: true,
    extraction: makeExtraction(),
    audit: {
      model: 'claude-opus-5-5',
      stopReason: 'end_turn',
      inputTokens: 1_800,
      outputTokens: 600,
      usedFallbackModel: false,
    },
  });
});

Deno.test('records when the fallback model answered', async () => {
  const sender = recordingSender(fakeMessage(makeExtraction(), { usedFallback: true }));

  const outcome = await createClaudeExtractor(sender.send).extract(JPEG_INPUT);

  assertEquals(outcome.audit?.usedFallbackModel, true);
});

const FAILURES: [string, Anthropic.Beta.Messages.BetaMessage | Error, string][] = [
  ['a refusal', fakeMessage('', { stopReason: 'refusal' }), 'enter the details yourself'],
  ['truncated output', fakeMessage('{"isRec', { stopReason: 'max_tokens' }), 'ran out of room'],
  ['invalid JSON', fakeMessage('not json'), 'unreadable answer'],
  ['JSON in the wrong shape', fakeMessage('{"isReceipt": "yes"}'), 'unreadable answer'],
  [
    'a rate limit',
    new Anthropic.RateLimitError(429, undefined, 'rate limited', new Headers()),
    'busy',
  ],
  [
    'a network failure',
    new Anthropic.APIConnectionError({ message: 'offline' }),
    'Could not reach',
  ],
  [
    'a bad API key',
    new Anthropic.AuthenticationError(401, undefined, 'bad key', new Headers()),
    'not set up correctly',
  ],
  [
    'a server error',
    new Anthropic.InternalServerError(500, undefined, 'boom', new Headers()),
    'had a problem',
  ],
  ['an unexpected error', new Error('surprise'), 'Something went wrong'],
];

for (const [name, reply, expectedReason] of FAILURES) {
  Deno.test(`turns ${name} into a readable failure`, async () => {
    const consoleError = console.error;
    console.error = () => {};
    try {
      const outcome = await createClaudeExtractor(recordingSender(reply).send).extract(JPEG_INPUT);

      assert(!outcome.ok);
      assert(
        outcome.reason.includes(expectedReason),
        `"${outcome.reason}" should mention "${expectedReason}"`,
      );
    } finally {
      console.error = consoleError;
    }
  });
}
