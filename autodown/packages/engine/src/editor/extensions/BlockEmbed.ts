import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import BlockEmbedNodeView from '../node-views/BlockEmbedNodeView.vue'

export interface BlockEmbedAttrs {
  raw: string
  title: string
  blockId: string | null
}

export interface BlockEmbedOptions {
  loadBlock?: (id: string) => Promise<any | null>
  HTMLAttributes?: Record<string, any>
}

function parseRaw(raw: string): BlockEmbedAttrs {
  const match = raw.match(/^!\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/)
  if (!match) {
    return { raw, title: 'Untitled', blockId: null }
  }
  return {
    raw,
    title: match[1].trim(),
    blockId: match[2]?.trim() || null,
  }
}

export const BlockEmbed = Node.create<BlockEmbedOptions>({
  name: 'blockEmbed',
  group: 'block',
  inline: false,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      loadBlock: undefined,
    }
  },

  addAttributes() {
    return {
      raw: {
        default: '![[Untitled]]',
        parseHTML: (element) => element.getAttribute('data-raw') || element.textContent || '![[Untitled]]',
        renderHTML: (attributes) => ({ 'data-raw': attributes.raw as string }),
      },
      title: {
        default: 'Untitled',
        parseHTML: (element) => element.getAttribute('data-title') || element.textContent || 'Untitled',
        renderHTML: (attributes) => ({ 'data-title': attributes.title as string }),
      },
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id') || null,
        renderHTML: (attributes) => {
          const value = attributes.blockId as string | null | undefined
          return value ? { 'data-block-id': value } : {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-block-embed]',
        getAttrs: (element) => {
          const raw = element.getAttribute('data-raw') || element.textContent || '![[Untitled]]'
          const parsed = parseRaw(raw)
          return { raw: parsed.raw, title: parsed.title, blockId: parsed.blockId }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as BlockEmbedAttrs
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
        'data-block-embed': '',
        'data-raw': attrs.raw,
        'data-title': attrs.title,
        class: 'autodown-block-embed',
      }),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(BlockEmbedNodeView as any)
  },

  markdownTokenName: 'blockEmbed',

  parseMarkdown(token, helpers) {
    return helpers.createNode('blockEmbed', {
      raw: token.raw as string,
      title: token.title as string,
      blockId: token.blockId || null,
    })
  },

  renderMarkdown(node) {
    return (node.attrs?.raw as string) || '![[Untitled]]'
  },

  markdownTokenizer: {
    name: 'blockEmbed',
    level: 'block',
    start(src) {
      const idx = src.indexOf('![[')
      return idx === -1 ? -1 : idx
    },
    tokenize(src) {
      const match = src.match(/^!\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?\]\]/)
      if (!match) return undefined
      return {
        type: 'blockEmbed',
        raw: match[0],
        title: match[1].trim(),
        blockId: match[2]?.trim() || null,
      }
    },
  },
})
