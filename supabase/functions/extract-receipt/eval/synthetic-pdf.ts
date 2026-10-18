/**
 * Builds a tiny one-page PDF from lines of text, so the eval can run on
 * receipts generated in code instead of committed binary files.
 */

const encoder = new TextEncoder();

export function textToPdf(lines: string[]): Uint8Array {
  const escape = (text: string) => text.replace(/[\\()]/g, (char) => `\\${char}`);
  const textCommands = lines.map((line) => `(${escape(line)}) Tj T*`).join('\n');
  const stream = `BT /F1 10 Tf 14 TL 24 560 Td\n${textCommands}\nET`;

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 320 600] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  const size = objects.length + 1;
  pdf += `xref\n0 ${size}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return encoder.encode(pdf);
}
