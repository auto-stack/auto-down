import { mergeAttributes, Node, type CommandProps } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import DetailsNodeView from '../node-views/DetailsNodeView.vue'

/**
 * CustomDetails — block-level collapsible details/summary.
 *
 * Markdown syntax (container style):
 *   :::details Click to expand
 *   Hidden content goes here.
 *   :::
 *
 * Both editor and preview render as a custom details/summary component.
 * Default state is collapsed (open: false).
 */
export const CustomDetails = Node.create({
  name: 'details',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: 'Details',
        parseHTML: (element) => {
          const summaryEl = element.querySelector('summary, .autodown-details-summary-text')
          return summaryEl?.textContent?.trim() || element.getAttribute('data-summary') || 'Details'
        },
        renderHTML: (attributes) => {
          const value = (attributes.summary as string) || 'Details'
          return { 'data-summary': value }
        },
      },
      open: {
        default: false,
        parseHTML: (element) => element.hasAttribute('open') || element.getAttribute('data-open') === 'true',
        renderHTML: (attributes) => {
          return (attributes.open as boolean) ? { 'data-open': 'true', open: '' } : { 'data-open': 'false' }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-details]',
      },
      {
        tag: 'details',
        getAttrs: (element) => {
          const summary = element.querySelector('summary')
          return {
            summary: summary?.textContent?.trim() || 'Details',
            open: element.hasAttribute('open'),
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const summary = (node.attrs.summary as string) || 'Details'
    const open = Boolean(node.attrs.open)

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-details': '',
        'data-open': open ? 'true' : 'false',
        class: 'autodown-details',
      }),
      [
        'div',
        { class: 'autodown-details-summary', 'data-details-summary': '' },
        ['span', { class: 'autodown-details-marker', 'aria-hidden': 'true' }, open ? '▼' : '▶'],
        ['span', { class: 'autodown-details-summary-text' }, summary],
      ],
      ['div', { class: 'autodown-details-content', 'data-details-content': '' }, 0],
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(DetailsNodeView as any)
  },

  markdownTokenName: 'details',

  parseMarkdown: (token, helpers) => {
    return helpers.createNode(
      'details',
      {
        summary: (token.summary as string) || 'Details',
        open: false,
      },
      helpers.parseChildren((token.tokens as Array<{ type: string; [key: string]: any }>) || [])
    )
  },

  renderMarkdown: (node, helpers) => {
    const summary = (node.attrs?.summary as string) || 'Details'
    const content = helpers.renderChildren(node.content || [])
    return `:::details ${summary}\n${content}\n:::`
  },

  markdownTokenizer: {
    name: 'details',
    level: 'block',
    start(src) {
      return src.match(/^:::\s*details\b/) ? 0 : -1
    },
    tokenize(src, _tokens, lexer) {
      const openMatch = src.match(/^:::\s*details(?:\s+(.*))?\n/)
      if (!openMatch) return undefined

      const summary = openMatch[1] || 'Details'

      // Find the closing `:::` on its own line.
      const closePattern = /\n:::\s*(?:\n|$)/
      const closeMatch = src.match(closePattern)
      if (!closeMatch || closeMatch.index === undefined) return undefined

      const contentStart = openMatch[0].length
      const contentEnd = closeMatch.index + 1
      const raw = src.slice(0, closeMatch.index + closeMatch[0].length)
      const content = src.slice(contentStart, contentEnd)

      return {
        type: 'details',
        raw,
        summary,
        text: content,
        tokens: lexer.blockTokens(content),
      }
    },
  },

  addCommands() {
    return {
      setDetails:
        (attributes: { summary?: string; open?: boolean } = {}) =>
        ({ commands }: CommandProps) => {
          const summary = attributes.summary ?? 'Details'
          const open = attributes.open ?? false
          return commands.setNode(this.name, { summary, open })
        },
      toggleDetails:
        (attributes: { summary?: string; open?: boolean } = {}) =>
        ({ commands }: CommandProps) => {
          return commands.toggleNode(this.name, 'paragraph', attributes)
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    details: {
      /**
       * Set the current block to a details/summary block.
       */
      setDetails: (attributes?: { summary?: string; open?: boolean }) => ReturnType
      /**
       * Toggle the current block between details and paragraph.
       */
      toggleDetails: (attributes?: { summary?: string; open?: boolean }) => ReturnType
    }
  }
}
