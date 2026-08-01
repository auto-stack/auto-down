// gen_lib_wikiLink.ts — gen-project stub for '@/lib/wikiLink'.
//
// Mirrored into gen/front/vue/src/lib/wikiLink.ts by the widget Regenerate
// flow so the panel extension modules (which re-export wikiTitleToPath /
// headingTextToBlockId via the dual-resolution relative path) type-check
// inside the self-contained gen project. NEVER SHIPS.
//
// Note: the real module's slugify/encodeBlockId are private; only the two
// public helpers used by the panel extensions are stubbed here.

export function wikiTitleToPath(title: string): string {
  return title
}

export function headingTextToBlockId(text: string): string {
  return text
}
