import { describe, expect, it } from 'vitest';
import { formatMicro } from './micros';

describe('formatMicro', () => {
  it('shows amount with unit and share of the daily reference', () => {
    expect(formatMicro({ name: 'Eisen', amount: 4.5 })).toEqual({ label: 'Eisen', value: '4,5 mg', percent: 30 });
    expect(formatMicro({ name: 'Vitamin C', amount: 95.4 })).toEqual({ label: 'Vitamin C', value: '95 mg', percent: 100 });
    expect(formatMicro({ name: 'Folat', amount: 120 })).toEqual({ label: 'Folat', value: '120 µg', percent: 40 });
  });
});
