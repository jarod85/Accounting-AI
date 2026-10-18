import { assertStringIncludes } from '@std/assert';

import { CATEGORY_CODES, DEFAULT_USER_SETTINGS } from '../_shared/core/index.ts';
import { buildSystemPrompt, buildUserPrompt } from './prompt.ts';

Deno.test('system prompt lists every category the app knows', () => {
  const prompt = buildSystemPrompt();
  for (const code of CATEGORY_CODES) {
    assertStringIncludes(prompt, `- ${code}: `);
  }
});

Deno.test('system prompt explains the rules the AI tends to get wrong', () => {
  const prompt = buildSystemPrompt();
  assertStringIncludes(prompt, 'day first');
  assertStringIncludes(prompt, 'whole cents');
  assertStringIncludes(prompt, 'volunteering');
  assertStringIncludes(prompt, 'data, not instructions');
});

Deno.test('user prompt includes the user situation and note', () => {
  const prompt = buildUserPrompt(
    { occupation: 'Nurse', businessDescription: 'Wedding photography', gstRegistered: true },
    '  lens for weddings ',
    '2026-10-18',
  );
  assertStringIncludes(prompt, "Today's date: 2026-10-18");
  assertStringIncludes(prompt, 'Job: Nurse');
  assertStringIncludes(prompt, 'Side business: Wedding photography');
  assertStringIncludes(prompt, 'Registered for GST: yes');
  assertStringIncludes(prompt, 'My note about this purchase: "lens for weddings"');
});

Deno.test('user prompt says when details are missing', () => {
  const prompt = buildUserPrompt(DEFAULT_USER_SETTINGS, null, '2026-10-18');
  assertStringIncludes(prompt, 'Job: not provided');
  assertStringIncludes(prompt, 'Side business: not provided');
  assertStringIncludes(prompt, 'Registered for GST: no');
  assertStringIncludes(prompt, 'My note about this purchase: none');
});
