import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import QueryBlockNodeView from '../node-views/QueryBlockNodeView.vue'

export interface QueryBlockOptions {
  runQuery?: (query: string) => Promise<any>
  HTMLAttributes?: Record<string, any>
}

export interface QueryBlockAttrs {
  query: string
}

export const QueryBlock = Node.create<QueryBlockOptions>({
  name: 'queryBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return {
      runQuery: undefined,
    }
  },

  addAttributes() {
    return {
      query: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-query') || element.textContent || '',
        renderHTML: (attributes) => ({ 'data-query': attributes.query as string }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-query-block]',
        getAttrs: (element) => ({
          query: element.getAttribute('data-query') || element.textContent || '',
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const query = (node.attrs.query as string) || ''
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
        'data-query-block': '',
        'data-query': query,
        class: 'autodown-query-block',
      }),
      `{{query ${query}}}`,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(QueryBlockNodeView as any)
  },

  markdownTokenName: 'queryBlock',

  parseMarkdown(token, helpers) {
    return helpers.createNode('queryBlock', {
      query: token.query as string,
    })
  },

  renderMarkdown(node) {
    return `{{query ${(node.attrs?.query as string) || ''}}}`
  },

  markdownTokenizer: {
    name: 'queryBlock',
    level: 'block',
    start(src) {
      const idx = src.indexOf('{{query')
      return idx === -1 ? -1 : idx
    },
    tokenize(src) {
      const match = src.match(/^\{\{query\s+(.+?)\}\}/s)
      if (!match) return undefined
      return {
        type: 'queryBlock',
        raw: match[0],
        query: match[1].trim(),
      }
    },
  },
})
