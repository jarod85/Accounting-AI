/**
 * Live eval: runs the real extractor (real Claude API calls, which cost money)
 * against the synthetic receipts in cases.ts and reports what matched.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npm run eval:receipts
 *
 * Run it after changing the prompt, schema or model. Each case costs a few cents.
 */

import { normalizeExtraction } from '../../_shared/core/index.ts';
import { createAnthropicMessageSender, createClaudeExtractor } from '../claude-extractor.ts';
import { EVAL_CASES, type EvalCase } from './cases.ts';
import { textToPdf } from './synthetic-pdf.ts';

const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
if (!apiKey) {
  console.error('Set ANTHROPIC_API_KEY to run the eval.');
  Deno.exit(1);
}

const extractor = createClaudeExtractor(createAnthropicMessageSender(apiKey));

async function runCase(evalCase: EvalCase): Promise<string[]> {
  const outcome = await extractor.extract({
    file: textToPdf(evalCase.receiptLines),
    mimeType: 'application/pdf',
    userNote: evalCase.userNote,
    settings: evalCase.settings,
    today: '2026-10-18',
  });
  if (!outcome.ok) {
    return [`extraction failed: ${outcome.reason}`];
  }

  const fields = normalizeExtraction(outcome.extraction);
  const { expected } = evalCase;
  const problems: string[] = [];
  const check = (name: string, actual: unknown, wanted: unknown) => {
    if (actual !== wanted) {
      problems.push(`${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(wanted)}`);
    }
  };
  check('category', fields.category, expected.category);
  check('totalCents', fields.totalCents, expected.totalCents);
  check('purchaseDate', fields.purchaseDate, expected.purchaseDate);
  check('isAsset', fields.isAsset, expected.isAsset);
  if (expected.workUseBelow !== undefined && fields.workUsePercent >= expected.workUseBelow) {
    problems.push(
      `workUsePercent: got ${fields.workUsePercent}, expected < ${expected.workUseBelow}`,
    );
  }
  console.log(`   description: ${fields.description}`);
  console.log(
    `   tokens: ${outcome.audit.inputTokens} in / ${outcome.audit.outputTokens} out (${outcome.audit.model})`,
  );
  return problems;
}

let passed = 0;
for (const evalCase of EVAL_CASES) {
  console.log(`\n• ${evalCase.name}`);
  const problems = await runCase(evalCase);
  if (problems.length === 0) {
    passed += 1;
    console.log('   PASS');
  } else {
    problems.forEach((problem) => console.log(`   FAIL ${problem}`));
  }
}

console.log(`\n${passed}/${EVAL_CASES.length} cases passed`);
Deno.exit(passed === EVAL_CASES.length ? 0 : 1);
