import { normalizeExtraction, ReceiptExtractionSchema } from './extraction.ts';
import { makeExtraction } from './testing.ts';

describe('ReceiptExtractionSchema', () => {
  it('accepts a well-formed extraction', () => {
    expect(ReceiptExtractionSchema.safeParse(makeExtraction()).success).toBe(true);
  });

  it('rejects an unknown category', () => {
    const result = ReceiptExtractionSchema.safeParse({
      ...makeExtraction(),
      suggestedCategory: 'snacks',
    });

    expect(result.success).toBe(false);
  });
});

describe('normalizeExtraction', () => {
  it('maps a confident extraction onto expense fields', () => {
    expect(normalizeExtraction(makeExtraction())).toEqual({
      merchantName: 'Officeworks',
      merchantAbn: '51824753556',
      purchaseDate: '2026-08-15',
      totalCents: 25_00,
      gstCents: 2_27,
      currency: 'AUD',
      category: 'work_other',
      workUsePercent: 100,
      isAsset: true,
      description: 'USB-C cable to connect work laptop to office monitor.',
      aiRationale: 'Computer accessory used for work.',
      lowConfidenceFields: [],
    });
  });

  it('drops an ABN that fails the checksum', () => {
    expect(normalizeExtraction(makeExtraction({ merchantAbn: '12 345 678 901' })).merchantAbn).toBe(
      null,
    );
  });

  it('drops an impossible date and flags it for review', () => {
    const fields = normalizeExtraction(makeExtraction({ purchaseDate: '2026-02-30' }));

    expect(fields.purchaseDate).toBeNull();
    expect(fields.lowConfidenceFields).toEqual(['purchaseDate']);
  });

  it('drops negative or fractional amounts', () => {
    const fields = normalizeExtraction(makeExtraction({ totalCents: -500, gstCents: 1.5 }));

    expect(fields.totalCents).toBeNull();
    expect(fields.gstCents).toBeNull();
    expect(fields.lowConfidenceFields).toEqual(['totalCents']);
  });

  it('drops GST that is larger than the total', () => {
    expect(
      normalizeExtraction(makeExtraction({ totalCents: 10_00, gstCents: 20_00 })).gstCents,
    ).toBe(null);
  });

  it('keeps GST when the total is unreadable', () => {
    expect(normalizeExtraction(makeExtraction({ totalCents: null, gstCents: 2_00 })).gstCents).toBe(
      2_00,
    );
  });

  it('clamps work-use percentage to 0–100', () => {
    expect(
      normalizeExtraction(makeExtraction({ suggestedWorkUsePercent: 140 })).workUsePercent,
    ).toBe(100);
    expect(
      normalizeExtraction(makeExtraction({ suggestedWorkUsePercent: -3 })).workUsePercent,
    ).toBe(0);
  });

  it('upper-cases a valid currency and defaults an invalid one to AUD', () => {
    expect(normalizeExtraction(makeExtraction({ currency: ' usd ' })).currency).toBe('USD');
    expect(normalizeExtraction(makeExtraction({ currency: 'dollars' })).currency).toBe('AUD');
  });

  it('flags low-confidence and missing fields', () => {
    const fields = normalizeExtraction(
      makeExtraction({
        merchantName: null,
        confidence: {
          merchantName: 'high',
          purchaseDate: 'high',
          totalCents: 'low',
          category: 'low',
        },
      }),
    );

    expect(fields.merchantName).toBeNull();
    expect(fields.lowConfidenceFields).toEqual(['merchantName', 'totalCents', 'category']);
  });

  it('treats a blank merchant name as missing', () => {
    expect(normalizeExtraction(makeExtraction({ merchantName: '   ' })).merchantName).toBeNull();
  });
});
