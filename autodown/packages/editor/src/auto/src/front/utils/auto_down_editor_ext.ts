// auto_down_editor_ext.ts — Hand-written TS extension for the
// AutoDownEditor widget (../auto_down_editor.at). Imported via
// `use { fn/component/composable: ... }`; the Auto build copies it into the
// gen project as src/ext/src/front/utils/auto_down_editor_ext.ts, and the
// generated AutoDownEditor.vue (copied to src/core/) imports it from
// ../auto/src/front/utils/auto_down_editor_ext.
//
// What remains here genuinely cannot be expressed in the DSL (see the
// widget's header comment for the full list): the zero-argument editor
// composable bridge (the DSL's composable imports take no arguments, so
// the useAutoDownEditor options object is assembled here from the
// component instance's props and tiptap's lifecycle callbacks are
// forwarded through inst.emit; useAutoDownEditor.ts itself is untouched),
// the 30-item static slash command manifest (lucide icons as data +
// block-body command closures with window.prompt / navigator.clipboard /
// DOM walking), normalizeAnchors (no regex literals in the DSL), the
// EditorContent / menu component re-exports (dual-resolution shim — a
// `use` path cannot leave src/), the Check/X lucide re-exports for the
// `dyn` render trick, and the blockMapOf/appendTableIAL re-exports behind
// the exposed getBlockMap and handleSave.
//
// The relative imports below resolve in BOTH trees at the same depth:
// editor tree src/auto/src/front/utils → src/..., gen tree
// gen/front/vue/src/ext/src/front/utils → gen/front/vue/src/... (stub
// mirrors are copied in by the regen script — the gen project has no
// @tiptap/katex/@autodown dependencies).
//
// No @tiptap imports on purpose (besides the type-only SlashItem): the
// editor instance is typed structurally as any.

import { getCurrentInstance, onMounted, reactive } from 'vue'
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Text,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Image,
  Table as TableIcon,
  AlertCircle,
  PanelTop,
  Sigma,
  Workflow,
  Check,
  X,
  Link,
  Search,
  Square,
  CircleDot,
  CheckCircle2,
  Clock,
  Timer,
  ArrowUp,
} from 'lucide-vue-next'
import type { SlashItem } from '../../../../menus/slashItem'
import { useAutoDownEditor } from '../../../../composables/useAutoDownEditor'

// Dual-resolution re-exports (editor tree: the real modules; gen tree:
// stubs). The katex CSS side-effect import lives in tiptapEditorContent.ts
// (the original AutoDownEditor.vue imported 'katex/dist/katex.min.css' at
// module scope; the gen project's stub omits it).
export { EditorContent } from '../../../../composables/tiptapEditorContent'
export { default as BubbleMenu } from '../../../../menus/BubbleMenu.vue'
export { default as SlashMenu } from '../../../../menus/SlashMenu.vue'
export { default as TableMenu } from '../../../../menus/TableMenu.vue'
export { default as CodeBlockMenu } from '../../../../menus/CodeBlockMenu.vue'

// The exposed imperative getBlockMap and handleSave's IAL post-processing —
// re-exported from the real extensions modules (same shim; gen stubs under
// stubs/gen_blockId.ts / gen_tableAttributes.ts).
export { getBlockMap as blockMapOf } from '../../../../extensions/BlockId'
export { appendTableIAL } from '../../../../extensions/tableAttributes'

// Lucide icons for the Save/Cancel buttons, rendered via `dyn` (the
// codeBlockCheckIcon trick).
export function editorCheckIcon(): unknown {
  return Check
}

export function editorXIcon(): unknown {
  return X
}

// The original's normalizeAnchors: strip trailing ` ^blockId` anchors per
// line before comparing editor content with the incoming prop (the DSL has
// no regex literals — same gap as node_view_ext's wiki-link parser).
export function normalizeAnchors(md: string): string {
  return md
    .split('\n')
    .map((line) => line.replace(/\s+\^[a-zA-Z0-9_-]+\s*$/, ''))
    .join('\n')
}

// The original's getCurrentBlockId helper (Block link slash command):
// walk from the selection's DOM position up to the nearest [data-block-id]
// element. Uses Node.TEXT_NODE / instanceof HTMLElement / closest — none
// expressible in the DSL.
function getCurrentBlockId(editor: any): string | null {
  if (!editor.view) return null
  const { from } = editor.state.selection
  const domPos = editor.view.domAtPos(from)
  let el = domPos.node
  if (el.nodeType === Node.TEXT_NODE) el = el.parentElement
  if (!(el instanceof HTMLElement)) return null
  const blockEl = el.closest('[data-block-id]') as HTMLElement | null
  return blockEl?.getAttribute('data-block-id') || null
}

// The original's baseSlashItems + extraSlashItems merge, verbatim. The
// closures capture the props object (read live at command time), exactly
// like the original component's closures captured `props`. Called once at
// setup by the bridge — the original's slashItems const was likewise
// evaluated once (props.extraSlashItems was never reactive).
export function getSlashItems(props: any): SlashItem[] {
  const baseSlashItems: SlashItem[] = [
    {
      title: 'Text',
      description: 'Plain text',
      icon: Text,
      searchTerms: ['p'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    {
      title: 'Heading 1',
      description: 'Big section heading',
      icon: Heading1,
      searchTerms: ['h1'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: Heading2,
      searchTerms: ['h2'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
    },
    {
      title: 'Heading 3',
      description: 'Small section heading',
      icon: Heading3,
      searchTerms: ['h3'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
    },
    {
      title: 'Heading 4',
      description: 'Fourth level heading',
      icon: Heading4,
      searchTerms: ['h4'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 4 }).run(),
    },
    {
      title: 'Heading 5',
      description: 'Fifth level heading',
      icon: Heading5,
      searchTerms: ['h5'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 5 }).run(),
    },
    {
      title: 'Heading 6',
      description: 'Sixth level heading',
      icon: Heading6,
      searchTerms: ['h6'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 6 }).run(),
    },
    {
      title: 'Bullet List',
      description: 'Bullet list',
      icon: List,
      searchTerms: ['ul'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: 'Numbered List',
      description: 'Numbered list',
      icon: ListOrdered,
      searchTerms: ['ol'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: 'Task List',
      description: 'Task list',
      icon: CheckSquare,
      searchTerms: ['task'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      title: 'Code Block',
      description: 'Code snippet',
      icon: Code,
      searchTerms: ['code'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCodeBlock({ language: 'text' }).run()
      },
    },
    {
      title: 'Quote',
      description: 'Quote',
      icon: Quote,
      searchTerms: ['blockquote'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: 'Divider',
      description: 'Horizontal rule',
      icon: Minus,
      searchTerms: ['hr'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: 'Image',
      description: 'Embed image',
      icon: Image,
      searchTerms: ['img'],
      command: ({ editor, range }) => {
        const url = window.prompt(props.imageUrlPrompt)
        if (url) editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
      },
    },
    {
      title: 'Table',
      description: 'Add table',
      icon: TableIcon,
      searchTerms: ['table'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      title: 'Callout',
      description: 'Admonition / callout box',
      icon: AlertCircle,
      searchTerms: ['callout', 'admonition', 'warning', 'tip', 'note'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setCallout({ type: 'note', title: 'Note' }).run()
      },
    },
    {
      title: 'Details',
      description: 'Collapsible details block',
      icon: PanelTop,
      searchTerms: ['details', 'toggle', 'collapse', 'accordion'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setDetails({ summary: 'Details' }).run()
      },
    },
    {
      title: 'Math',
      description: 'Block math formula (KaTeX)',
      icon: Sigma,
      searchTerms: ['math', 'katex', 'formula', 'equation', 'latex'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setMathBlock().run()
      },
    },
    {
      title: 'Mermaid',
      description: 'Mermaid diagram',
      icon: Workflow,
      searchTerms: ['mermaid', 'diagram', 'chart', 'flowchart'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setMermaidBlock().run()
      },
    },
    {
      title: 'TODO',
      description: 'Insert a TODO task',
      icon: Square,
      searchTerms: ['todo', 'task'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('- TODO ').run(),
    },
    {
      title: 'DOING',
      description: 'Insert a DOING task',
      icon: CircleDot,
      searchTerms: ['doing', 'task'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('- DOING ').run(),
    },
    {
      title: 'DONE',
      description: 'Insert a DONE task',
      icon: CheckCircle2,
      searchTerms: ['done', 'task'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('- DONE ').run(),
    },
    {
      title: 'NOW',
      description: 'Insert a NOW task',
      icon: Clock,
      searchTerms: ['now', 'task'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('- NOW ').run(),
    },
    {
      title: 'LATER',
      description: 'Insert a LATER task',
      icon: Timer,
      searchTerms: ['later', 'task'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('- LATER ').run(),
    },
    {
      title: 'Priority A',
      description: 'Insert [#A] priority',
      icon: ArrowUp,
      searchTerms: ['priority', 'A'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('[#A] ').run(),
    },
    {
      title: 'Priority B',
      description: 'Insert [#B] priority',
      icon: ArrowUp,
      searchTerms: ['priority', 'B'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('[#B] ').run(),
    },
    {
      title: 'Priority C',
      description: 'Insert [#C] priority',
      icon: ArrowUp,
      searchTerms: ['priority', 'C'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent('[#C] ').run(),
    },
    {
      title: 'Query',
      description: 'Insert a query macro',
      icon: Search,
      searchTerms: ['query', 'macro'],
      command: ({ editor, range }) => {
        const q = window.prompt('Query (e.g. (task TODO DOING))', '(task TODO)')
        if (q) {
          editor.chain().focus().deleteRange(range).insertContent(`{{query ${q}}}`).run()
        }
      },
    },
    {
      title: 'Block link',
      description: 'Copy link to current block',
      icon: Link,
      searchTerms: ['block link', 'anchor', 'copy link'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        const title = props.pageTitle
        const id = getCurrentBlockId(editor)
        if (title && id) {
          const link = `[[${title}#^${id}]]`
          navigator.clipboard.writeText(link).catch(() => {})
        }
      },
    },
  ]
  return [...baseSlashItems, ...(props.extraSlashItems ?? [])]
}

// The editor-creating composable, imported by the widget via
// `use { composable: ... }` — the codegen calls it ONCE at <script setup>
// top level with ZERO arguments, so the options object is assembled here
// from the component instance's props (resolved, with the widget's
// generated withDefaults applied). tiptap's useEditor registers its
// onMounted/onBeforeUnmount inside this call, which runs in setup scope
// as required.
//
// tiptap lifecycle callbacks are forwarded through inst.emit(...) using
// the widget's QUOTED msg variants (update/blur/focus/link-click/
// open-wiki-link) — quoted variants are contractual emit names, always
// declared in defineEmits (plan 013 Phase 2 compiler fix), so the parent
// listeners no longer fall through as native DOM listeners. The original's
// `onOpenWikiLink` prop callback is ALSO invoked, matching the original
// component's dual channel.
//
// Returns a reactive `{ items, editor }` bag. reactive() keeps the editor
// ref linked (reads/writes unwrap it), so when tiptap's useEditor assigns
// the instance in its onMounted, `.autoDownEditorBridge.editor` becomes
// live everywhere in the widget — the ONLY channel that works in
// production builds (inline-template <script setup> returns a render
// function, leaving setupState empty; extension code cannot reach the
// widget's model vars through the component proxy).
//
// Also merges the editor REF into the widget's exposed surface on mount
// (defineExpose runs at setup end, after this composable, so the merge
// must defer to onMounted). The demo e2e harness reads
// el.__vueParentComponent.exposed.editor.value — keep the ref shape.
export function useAutoDownEditorBridge(): { items: SlashItem[]; editor: any } {
  const inst = getCurrentInstance()!
  const props = inst.props as any

  const slashItems = getSlashItems(props)

  const editor = useAutoDownEditor({
    content: props.content,
    placeholder: props.placeholder,
    editable: props.canEdit,
    autofocus: props.autofocus ?? false,
    slashItems,
    loadBlock: props.loadBlock,
    onAssetUpload: props.onAssetUpload,
    taskWorkflow: props.taskWorkflow,
    runQuery: props.runQuery,
    onUpdate: (editorInstance: any) => {
      inst.emit('update', editorInstance.getMarkdown())
    },
    onBlur: () => {
      inst.emit('blur')
    },
    onFocus: () => {
      inst.emit('focus')
    },
    onLinkClick: (id: string) => {
      inst.emit('link-click', id)
    },
    onOpenWikiLink: (title: string, blockId?: string | null) => {
      inst.emit('open-wiki-link', title, blockId)
      props.onOpenWikiLink?.(title, blockId)
    },
  })

  onMounted(() => {
    if (inst.exposed) {
      ;(inst.exposed as any).editor = editor
    }
  })

  return reactive({ items: slashItems, editor })
}
