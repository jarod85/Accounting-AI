import { formatAbn, isValidAbn, normalizeAbn } from './abn.ts';

describe('isValidAbn', () => {
  it.each(['51824753556', '51 824 753 556', '53 004 085 616'])('accepts %s', (abn) => {
    expect(isValidAbn(abn)).toBe(true);
  });

  it.each(['51824753557', '5182475355', '518247535561', '', 'not an abn'])(
    'rejects "%s"',
    (abn) => {
      expect(isValidAbn(abn)).toBe(false);
    },
  );
});

describe('normalizeAbn', () => {
  it('keeps digits only', () => {
    expect(normalizeAbn('ABN: 51 824-753 556')).toBe('51824753556');
  });
});

describe('formatAbn', () => {
  it('groups digits the way invoices print them', () => {
    expect(formatAbn('51824753556')).toBe('51 824 753 556');
  });

  it('leaves values of the wrong length unchanged', () => {
    expect(formatAbn('123')).toBe('123');
  });
});
