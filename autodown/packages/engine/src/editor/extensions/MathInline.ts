import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MathInlineNodeView from '../node-views/MathInlineNodeView.vue'

export interface MathInlineAttrs {
  source: string
}

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-math-inline-source') || element.textContent || '',
        renderHTML: (attributes) => ({ 'data-math-inline-source': attributes.source as string }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-math-inline]',
        getAttrs: (element) => {
          return {
            source: element.getAttribute('data-math-inline-source') || element.textContent || '',
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const source = (node.attrs.source as string) || ''
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
        'data-math-inline': '',
        'data-math-inline-source': source,
        class: 'autodown-math-inline',
      }),
      `$${source}$`,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(MathInlineNodeView as any)
  },

  markdownTokenName: 'mathInline',

  parseMarkdown(token, helpers) {
    return helpers.createNode('mathInline', {
      source: token.source as string,
    })
  },

  renderMarkdown(node) {
    return `$${(node.attrs?.source as string) || ''}$`
  },

  markdownTokenizer: {
    name: 'mathInline',
    level: 'inline',
    start(src) {
      // Only match single-line math delimited by $...$ that is not escaped.
      const idx = src.search(/(?<!\\)\$/)
      return idx === -1 ? -1 : idx
    },
    tokenize(src) {
      // Match $...$ where content does not contain $ or newlines.
      const match = src.match(/^\$([^$\n]+)\$/)
      if (!match) return undefined
      return {
        type: 'mathInline',
        raw: match[0],
        source: match[1],
      }
    },
  },
})
