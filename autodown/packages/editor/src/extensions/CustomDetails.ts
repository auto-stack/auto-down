import { mergeAttributes, Node, type CommandProps } from '@tiptap/core'

/**
 * CustomDetails — block-level collapsible details/summary.
 *
 * Markdown syntax (container style):
 *   :::details Click to expand
 *   Hidden content goes here.
 *   :::
 *
 * The first line after `:::details` becomes the summary text. In the preview
 * renderer this container is translated to native `<details>` / `<summary>`
 * HTML so browsers handle expansion/collapse.
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
          const summaryEl = element.querySelector('summary')
          return summaryEl?.textContent || element.getAttribute('data-summary') || 'Details'
        },
        renderHTML: (attributes) => {
          const value = (attributes.summary as string) || 'Details'
          return { 'data-summary': value }
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
            summary: summary?.textContent || 'Details',
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const summary = (node.attrs.summary as string) || 'Details'

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-details': '',
        class: 'autodown-details',
      }),
      [
        'div',
        {
          class: 'autodown-details-header',
          'data-details-header': '',
        },
        ['span', { class: 'autodown-details-marker' }, '▶'],
        ['span', { class: 'autodown-details-summary' }, summary],
      ],
      ['div', { class: 'autodown-details-content' }, 0],
    ]
  },

  markdownTokenName: 'details',

  parseMarkdown: (token, helpers) => {
    return helpers.createNode(
      'details',
      {
        summary: (token.summary as string) || 'Details',
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
        (attributes: { summary?: string } = {}) =>
        ({ commands }: CommandProps) => {
          const summary = attributes.summary ?? 'Details'
          return commands.setNode(this.name, { summary })
        },
      toggleDetails:
        (attributes: { summary?: string } = {}) =>
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
      setDetails: (attributes?: { summary?: string }) => ReturnType
      /**
       * Toggle the current block between details and paragraph.
       */
      toggleDetails: (attributes?: { summary?: string }) => ReturnType
    }
  }
}
