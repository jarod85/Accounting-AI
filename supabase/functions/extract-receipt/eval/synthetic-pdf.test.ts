import { assert, assertStringIncludes } from '@std/assert';

import { textToPdf } from './synthetic-pdf.ts';

Deno.test('builds a PDF whose xref offsets point at each object', () => {
  const pdf = new TextDecoder().decode(textToPdf(['TOTAL $24.95', 'Paid (card)']));

  assert(pdf.startsWith('%PDF-1.4\n'));
  assert(pdf.endsWith('%%EOF\n'));
  assertStringIncludes(pdf, '(Paid \\(card\\)) Tj');

  const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));
  offsets.forEach((offset, index) => {
    assert(pdf.startsWith(`${index + 1} 0 obj`, offset), `object ${index + 1} is at its offset`);
  });
  const startXref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
  assert(pdf.startsWith('xref', startXref));
});
