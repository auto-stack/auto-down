// gen_slashItem.ts — Gen-project stub for src/menus/slashItem.ts (the real
// SlashItem interface imports types from @tiptap/core, which the gen
// project does not depend on). Mirrored into
// gen/front/vue/src/menus/slashItem.ts by the regen script. Never ships.
export interface SlashItem {
  title: string
  description: string
  icon: any
  searchTerms: string[]
  command: (ctx: { editor: any; range: any }) => void
}
