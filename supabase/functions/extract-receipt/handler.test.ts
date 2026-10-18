import { assertEquals } from '@std/assert';

import type { UserSettings } from '../_shared/core/index.ts';
import { makeExtraction } from '../_shared/core/testing.ts';
import type { ExtractionOutcome, ReceiptExtractor, ReceiptInput } from './claude-extractor.ts';
import {
  createHandler,
  type ExpenseStore,
  type ExtractionResult,
  type HandlerDependencies,
  type StoredReceipt,
} from './handler.ts';

const EXPENSE_ID = '6f1c1a52-6a0e-4c43-9b55-5b3a8f0c2d11';
const AUDIT = {
  model: 'claude-opus-5-5',
  stopReason: 'end_turn',
  inputTokens: 1,
  outputTokens: 1,
  usedFallbackModel: false,
};

function inMemoryStore(options: { expense?: StoredReceipt | null; downloadFails?: boolean } = {}) {
  const saved: { expenseId: string; result: ExtractionResult }[] = [];
  const store: ExpenseStore = {
    findExpense: (id) =>
      Promise.resolve(
        options.expense === undefined
          ? id === EXPENSE_ID
            ? {
              id,
              status: 'processing',
              receiptPath: `user-1/${id}.jpg`,
              receiptMimeType: 'image/jpeg',
              userNote: 'cable for work',
            }
            : null
          : options.expense,
      ),
    findSettings: () =>
      Promise.resolve<UserSettings>({
        occupation: 'Engineer',
        businessDescription: '',
        gstRegistered: false,
      }),
    downloadReceipt: () =>
      options.downloadFails
        ? Promise.reject(new Error('not found'))
        : Promise.resolve(new Uint8Array([1, 2, 3])),
    saveResult: (expenseId, result) => {
      saved.push({ expenseId, result });
      return Promise.resolve();
    },
  };
  return { store, saved };
}

function fakeExtractor(outcome: ExtractionOutcome) {
  const inputs: ReceiptInput[] = [];
  const extractor: ReceiptExtractor = {
    extract: (input) => {
      inputs.push(input);
      return Promise.resolve(outcome);
    },
  };
  return { extractor, inputs };
}

function setup(
  options: {
    store?: ReturnType<typeof inMemoryStore>;
    outcome?: ExtractionOutcome;
    email?: string | null;
    allowedEmails?: string[];
  } = {},
) {
  const { store, saved } = options.store ?? inMemoryStore();
  const { extractor, inputs } = fakeExtractor(
    options.outcome ?? { ok: true, extraction: makeExtraction(), audit: AUDIT },
  );
  const deps: HandlerDependencies = {
    authenticate: (header) =>
      Promise.resolve(
        header === 'Bearer good-token'
          ? { email: options.email === undefined ? 'me@example.com' : options.email, store }
          : null,
      ),
    extractor,
    allowedEmails: options.allowedEmails ? new Set(options.allowedEmails) : null,
    today: () => '2026-10-18',
  };
  return { handler: createHandler(deps), saved, inputs };
}

function post(body: unknown, token = 'good-token'): Request {
  return new Request('http://localhost/extract-receipt', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function call(handler: (request: Request) => Promise<Response>, request: Request) {
  const response = await handler(request);
  return { status: response.status, body: await response.json() };
}

Deno.test('reads the receipt and saves it for review', async () => {
  const { handler, saved, inputs } = setup();

  const response = await call(handler, post({ expenseId: EXPENSE_ID }));

  assertEquals(response, { status: 200, body: { status: 'needs_review', failureReason: null } });
  assertEquals(inputs[0]?.userNote, 'cable for work');
  assertEquals(inputs[0]?.settings.occupation, 'Engineer');
  assertEquals(inputs[0]?.today, '2026-10-18');
  assertEquals(saved.length, 1);
  const result = saved[0]?.result;
  assertEquals(result?.status, 'needs_review');
  if (result?.status === 'needs_review') {
    assertEquals(result.fields.merchantAbn, '51824753556');
    assertEquals(result.fields.category, 'work_other');
  }
});

Deno.test('marks the expense failed when the AI cannot read it', async () => {
  const { handler, saved } = setup({
    outcome: { ok: false, reason: 'The AI service is busy.', audit: null },
  });

  const response = await call(handler, post({ expenseId: EXPENSE_ID }));

  assertEquals(response.body, { status: 'failed', failureReason: 'The AI service is busy.' });
  assertEquals(saved[0]?.result, {
    status: 'failed',
    failureReason: 'The AI service is busy.',
    audit: null,
  });
});

Deno.test('marks the expense failed when the file is not a receipt', async () => {
  const { handler } = setup({
    outcome: { ok: true, extraction: makeExtraction({ isReceipt: false }), audit: AUDIT },
  });

  const response = await call(handler, post({ expenseId: EXPENSE_ID }));

  assertEquals(response.body.status, 'failed');
  assertEquals(response.body.failureReason.startsWith("This doesn't look like a receipt"), true);
});

Deno.test('marks the expense failed when the receipt file is missing', async () => {
  const consoleError = console.error;
  console.error = () => {};
  try {
    const { handler, inputs } = setup({ store: inMemoryStore({ downloadFails: true }) });

    const response = await call(handler, post({ expenseId: EXPENSE_ID }));

    assertEquals(response.body, {
      status: 'failed',
      failureReason: 'Could not open the receipt file.',
    });
    assertEquals(inputs.length, 0, 'the AI is not called');
  } finally {
    console.error = consoleError;
  }
});

Deno.test('rejects a missing or invalid token', async () => {
  const { handler } = setup();

  assertEquals((await call(handler, post({ expenseId: EXPENSE_ID }, 'bad-token'))).status, 401);
  const noHeader = new Request('http://localhost/', { method: 'POST', body: '{}' });
  assertEquals((await call(handler, noHeader)).status, 401);
});

Deno.test('enforces the email allowlist when one is set', async () => {
  const allowed = setup({ email: 'Me@Example.com', allowedEmails: ['me@example.com'] });
  assertEquals((await call(allowed.handler, post({ expenseId: EXPENSE_ID }))).status, 200);

  const stranger = setup({ email: 'stranger@example.com', allowedEmails: ['me@example.com'] });
  assertEquals((await call(stranger.handler, post({ expenseId: EXPENSE_ID }))).status, 403);

  const noEmail = setup({ email: null, allowedEmails: ['me@example.com'] });
  assertEquals((await call(noEmail.handler, post({ expenseId: EXPENSE_ID }))).status, 403);
});

Deno.test('rejects a bad request body', async () => {
  const { handler } = setup();

  assertEquals((await call(handler, post({ expenseId: 'not-a-uuid' }))).status, 400);
  assertEquals((await call(handler, post('not json'))).status, 400);
});

Deno.test('returns 404 for an expense the user cannot see', async () => {
  const { handler, saved } = setup({ store: inMemoryStore({ expense: null }) });

  assertEquals((await call(handler, post({ expenseId: EXPENSE_ID }))).status, 404);
  assertEquals(saved.length, 0);
});

Deno.test('does not re-read a confirmed expense', async () => {
  const { handler, inputs } = setup({
    store: inMemoryStore({
      expense: {
        id: EXPENSE_ID,
        status: 'confirmed',
        receiptPath: 'user-1/x.jpg',
        receiptMimeType: 'image/jpeg',
        userNote: null,
      },
    }),
  });

  assertEquals((await call(handler, post({ expenseId: EXPENSE_ID }))).status, 409);
  assertEquals(inputs.length, 0);
});

Deno.test('returns 500 when saving fails', async () => {
  const consoleError = console.error;
  console.error = () => {};
  try {
    const store = inMemoryStore();
    store.store.saveResult = () => Promise.reject(new Error('database down'));
    const { handler } = setup({ store });

    assertEquals((await call(handler, post({ expenseId: EXPENSE_ID }))).status, 500);
  } finally {
    console.error = consoleError;
  }
});

Deno.test('answers CORS preflight and rejects other methods', async () => {
  const { handler } = setup();

  const preflight = await handler(new Request('http://localhost/', { method: 'OPTIONS' }));
  assertEquals(preflight.status, 204);
  await preflight.body?.cancel();

  assertEquals((await call(handler, new Request('http://localhost/'))).status, 405);
});
