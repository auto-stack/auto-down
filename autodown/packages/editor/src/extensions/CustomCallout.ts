import { mergeAttributes, Node, type CommandProps } from '@tiptap/core'

/**
 * Supported callout/admonition types. These align with the container names
 * that markstream-vue renders as AdmonitionNode (:::note, :::warning, ...).
 */
export const CALLOUT_TYPES = ['note', 'info', 'tip', 'warning', 'caution', 'danger', 'error'] as const
export type CalloutType = (typeof CALLOUT_TYPES)[number]

function isValidCalloutType(value: string): value is CalloutType {
  return CALLOUT_TYPES.includes(value as CalloutType)
}

function defaultTitle(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

/**
 * CustomCallout — block-level admonition/callout.
 *
 * Markdown syntax (container style, compatible with markstream-vue):
 *   :::warning Be careful
 *   Here is the warning body.
 *   :::
 *
 * The `type` attribute maps to the admonition kind and the optional `title`
 * is shown in the editor header bar.
 */
export const CustomCallout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'note',
        parseHTML: (element) => {
          const value = element.getAttribute('data-callout-type')
          return isValidCalloutType(value || '') ? value : 'note'
        },
        renderHTML: (attributes) => {
          const value = attributes.type || 'note'
          return { 'data-callout-type': value }
        },
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-callout-title') || '',
        renderHTML: (attributes) => {
          const value = (attributes.title as string) || ''
          return value ? { 'data-callout-title': value } : {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs.type as string) || 'note'
    const title = ((node.attrs.title as string) || '') || defaultTitle(type)

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-callout': '',
        class: `autodown-callout autodown-callout-${type}`,
      }),
      [
        'div',
        {
          class: 'autodown-callout-header',
          'data-callout-header': '',
          'data-callout-type': type,
        },
        ['span', { class: 'autodown-callout-icon' }, calloutIcon(type)],
        ['span', { class: 'autodown-callout-title' }, title],
      ],
      ['div', { class: 'autodown-callout-content' }, 0],
    ]
  },

  markdownTokenName: 'callout',

  parseMarkdown: (token, helpers) => {
    return helpers.createNode(
      'callout',
      {
        type: isValidCalloutType(token.calloutType as string) ? token.calloutType : 'note',
        title: (token.title as string) || '',
      },
      helpers.parseChildren((token.tokens as Array<{ type: string; [key: string]: any }>) || [])
    )
  },

  renderMarkdown: (node, helpers) => {
    const type = (node.attrs?.type as string) || 'note'
    const title = (node.attrs?.title as string) || ''
    const header = title ? `:::${type} ${title}` : `:::${type}`
    const content = helpers.renderChildren(node.content || [])
    return `${header}\n${content}\n:::`
  },

  markdownTokenizer: {
    name: 'callout',
    level: 'block',
    start(src) {
      const match = src.match(/^:::\s*([a-zA-Z0-9_-]+)/)
      if (!match) return -1
      // Leave "details" for CustomDetails.
      return match[1].toLowerCase() === 'details' ? -1 : 0
    },
    tokenize(src, _tokens, lexer) {
      const openMatch = src.match(/^:::\s*([a-zA-Z0-9_-]+)(?:\s+(.*))?\n/)
      if (!openMatch) return undefined

      const calloutType = openMatch[1]
      const title = openMatch[2] || ''

      // Find the closing `:::` on its own line.
      const closePattern = /\n:::\s*(?:\n|$)/
      const closeMatch = src.match(closePattern)
      if (!closeMatch || closeMatch.index === undefined) return undefined

      const contentStart = openMatch[0].length
      const contentEnd = closeMatch.index + 1 // include the newline before :::
      const raw = src.slice(0, closeMatch.index + closeMatch[0].length)
      const content = src.slice(contentStart, contentEnd)

      return {
        type: 'callout',
        raw,
        calloutType,
        title,
        text: content,
        tokens: lexer.blockTokens(content),
      }
    },
  },

  addCommands() {
    return {
      setCallout:
        (attributes: { type?: CalloutType; title?: string } = {}) =>
        ({ commands }: CommandProps) => {
          const type = attributes.type && isValidCalloutType(attributes.type) ? attributes.type : 'note'
          const title = attributes.title ?? defaultTitle(type)
          return commands.setNode(this.name, { type, title })
        },
      toggleCallout:
        (attributes: { type?: CalloutType; title?: string } = {}) =>
        ({ commands }: CommandProps) => {
          return commands.toggleNode(this.name, 'paragraph', attributes)
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Set the current block to a callout.
       */
      setCallout: (attributes?: { type?: CalloutType; title?: string }) => ReturnType
      /**
       * Toggle the current block between callout and paragraph.
       */
      toggleCallout: (attributes?: { type?: CalloutType; title?: string }) => ReturnType
    }
  }
}

/**
 * Minimal callout icon rendered as a text symbol. Avoids an SVG dependency in
 * ProseMirror node views (mirrors the copy-icon strategy used by CustomCodeBlock).
 */
function calloutIcon(type: string): string {
  const icons: Record<string, string> = {
    note: '📝',
    info: 'ℹ️',
    tip: '💡',
    warning: '⚠️',
    caution: '⚠️',
    danger: '🛑',
    error: '❌',
  }
  return icons[type] || icons.note
}
