// flashcard_modal_ext.ts — hand-written TS extension for flashcard_modal.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the lucide icon re-export (rendered via `dyn`),
// - getDueCardsSafe / reviewCardSafe (try/catch around the SRS API: the
//   catch branch comes back as { ..., error } data so the promises never
//   reject and the widget's single .then carries both branches plus the
//   finally's loading=false; "" error = the original's null),
// - cardAt / cardQuestion / cardAnswer (the `cards[index] || null` and
//   `current?.question || current?.raw` optional-chain fallbacks — no
//   optional chaining in the DSL),
// - counterText (the `{{ index + 1 }} / {{ cards.length }}` header — no
//   arithmetic in view text).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { Brain } from 'lucide-vue-next'
import { getDueCards, reviewCard, type Card } from '../../../../src/lib/api'

export { Brain }

export interface DueCardsOutcome {
  cards: Card[]
  error: string
}

/** Original load(): `await getDueCards(50)`; the catch branch comes back as
 *  { cards: [], error } data so the promise never rejects. */
export async function getDueCardsSafe(): Promise<DueCardsOutcome> {
  try {
    const res = await getDueCards(50)
    return { cards: res.cards, error: '' }
  } catch (e: any) {
    return { cards: [], error: e.message || String(e) }
  }
}

/** Original rate()'s `await reviewCard(...)`; the catch branch comes back as
 *  { error } data so the promise never rejects. */
export async function reviewCardSafe(
  pagePath: string,
  blockId: string,
  grade: number,
): Promise<{ error: string }> {
  try {
    await reviewCard(pagePath, blockId, grade)
    return { error: '' }
  } catch (e: any) {
    return { error: e.message || String(e) }
  }
}

/** Original: const current = computed(() => cards.value[index.value] || null). */
export function cardAt(cards: Card[], index: number): Card | null {
  return (cards ?? [])[index] ?? null
}

/** Original: {{ current?.question || current?.raw }}. */
export function cardQuestion(card: Card | null): string {
  return card?.question || card?.raw || ''
}

/** Original: {{ current?.answer || current?.raw }}. */
export function cardAnswer(card: Card | null): string {
  return card?.answer || card?.raw || ''
}

/** Original header: {{ index + 1 }} / {{ cards.length }}. */
export function counterText(index: number, count: number): string {
  return `${index + 1} / ${count}`
}
