import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { MICRO_NAMES } from './lib/micros';

const tag = z
  .string()
  .trim()
  .min(1)
  .refine((t) => !t.includes(','), 'Tags dürfen kein Komma enthalten');

const recipes = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './src/content/recipes',
    generateId: ({ entry }) => entry.split(/[\\/]/)[0],
  }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        servings: z.number().int().min(1),
        servingsLabel: z.string().min(1).default('Personen'),
        tags: z.array(tag),
        /** Stichwörter für die Suche, z. B. Periode oder Weihnachten. */
        keywords: z.array(tag).default([]),
        /** Tage, an denen das Rezept gekocht wurde („Heute gekocht“ auf der Rezeptseite), z. B. [2026-10-17]. */
        cooked: z.array(z.coerce.date()).default([]),
        added: z.coerce.date(),
        cover: image().optional(),
        duration: z.number().int().positive().optional(),
        rating: z.number().int().min(1).max(5).optional(),
        book: z.enum(['janita', 'mirco']).default('janita'),
        nutrition: z
          .object({
            kcal: z.number().int().positive(),
            protein: z.number().int().min(0),
            carbs: z.number().int().min(0),
            fat: z.number().int().min(0),
          })
          .strict(),
        /** Gesundheitsaspekte, je Eintrag „Bereich: Grund“, z. B. „Immunsystem: viel Vitamin C aus Paprika“. */
        health: z.array(z.string().trim().min(1)).default([]),
        /** Top-Vitamine und -Mineralstoffe pro Portion, Menge in der Einheit aus src/lib/micros.ts. */
        micros: z.array(z.object({ name: z.enum(MICRO_NAMES), amount: z.number().positive() }).strict()).max(5).default([]),
        source: z
          .string()
          .min(1)
          .refine((s) => !s.startsWith('http') || URL.canParse(s), 'Quelle ist keine gültige URL')
          .optional(),
      })
      .strict(),
});

export const collections = { recipes };
