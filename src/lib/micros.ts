// Referenzwerte pro Tag für Frauen (19–50 Jahre) nach DGE, gerundet.
export const MICROS = {
  'Vitamin A': { unit: 'µg', daily: 700 },
  'Vitamin B1': { unit: 'mg', daily: 1 },
  'Vitamin B2': { unit: 'mg', daily: 1.1 },
  'Vitamin B6': { unit: 'mg', daily: 1.4 },
  'Vitamin B12': { unit: 'µg', daily: 4 },
  'Vitamin C': { unit: 'mg', daily: 95 },
  'Vitamin D': { unit: 'µg', daily: 20 },
  'Vitamin E': { unit: 'mg', daily: 12 },
  'Vitamin K': { unit: 'µg', daily: 60 },
  Folat: { unit: 'µg', daily: 300 },
  Biotin: { unit: 'µg', daily: 40 },
  Niacin: { unit: 'mg', daily: 12 },
  Eisen: { unit: 'mg', daily: 15 },
  Magnesium: { unit: 'mg', daily: 300 },
  Calcium: { unit: 'mg', daily: 1000 },
  Zink: { unit: 'mg', daily: 8 },
  Kalium: { unit: 'mg', daily: 4000 },
  Selen: { unit: 'µg', daily: 60 },
  Jod: { unit: 'µg', daily: 150 },
  'Omega-3': { unit: 'g', daily: 0.25 },
} as const;

export type MicroName = keyof typeof MICROS;
export const MICRO_NAMES = Object.keys(MICROS) as [MicroName, ...MicroName[]];

export interface Micro {
  name: MicroName;
  amount: number;
}

export function formatMicro({ name, amount }: Micro): { label: string; value: string; percent: number } {
  const { unit, daily } = MICROS[name];
  const shown = amount >= 10 ? Math.round(amount).toString() : amount.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return { label: name, value: `${shown} ${unit}`, percent: Math.round((amount / daily) * 100) };
}
