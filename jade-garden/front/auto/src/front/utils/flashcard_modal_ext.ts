// flashcard_modal_ext.ts — hand-written TS extension for flashcard_modal.at.
//
// Only what the DSL genuinely cannot express lives here:
// - the lucide icon re-export (rendered via `dyn`),
// - errorMessage (strict-TS unknown-catch domain: the DSL catch binding
//   emits a bare `catch (e)`, and front tsconfig strict makes `e` unknown —
//   the message extraction lives on the typed TS side; 076 search_panel
//   precedent),
// - the get_due_cards / review_card contract aliases (PLAN-077 sink: the
//   widget's handler bodies call the contract fns from the .at, so the
//   generated SFC emits `import { get_due_cards, review_card } from
//   '@/lib/api'` and the deploy sed rewrites it to this shim —
//   search_pages precedent).
//
// PLAN-077 T-03 sink: getDueCardsSafe/reviewCardSafe (orchestration),
// cardAt/cardQuestion/cardAnswer (guard chains) and counterText (f-string
// math) moved into the .at as module fns / handler try/catch/finally bodies
// (mode doc §6.6).
//
// Relative imports: this file is shared verbatim between trees; the paths
// below resolve to front/src/... in the jade-garden front tree.
import { Brain } from 'lucide-vue-next'
import { getDueCards, reviewCard } from '../../../../src/lib/api'

export { Brain }

/** The sunk handler bodies' catch extracts the message here (strict TS
 *  makes a bare `catch (e)` binding unknown; the DSL has no typed-catch
 *  word). */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message || String(e)
  return String(e)
}

/** Contract-name alias of the hand-written client (search_pages precedent). */
export async function get_due_cards(limit: number): Promise<any> {
  return getDueCards(limit)
}

/** Contract-name alias of the hand-written client. */
export async function review_card(
  pagePath: string,
  blockId: string,
  grade: number,
): Promise<any> {
  return reviewCard(pagePath, blockId, grade)
}
