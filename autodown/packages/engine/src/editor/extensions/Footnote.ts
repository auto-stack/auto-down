import { mergeAttributes, Node } from '@tiptap/core'

export const FootnoteRef = Node.create({
  name: 'footnoteRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-footnote-id') || element.textContent?.replace(/\[\^|\]/g, '') || '',
        renderHTML: (attributes) => ({ 'data-footnote-id': attributes.id as string }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-footnote-ref]',
        getAttrs: (element) => ({
          id: element.getAttribute('data-footnote-id') || element.textContent?.replace(/\[\^|\]/g, '') || '',
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const id = (node.attrs.id as string) || ''
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
        'data-footnote-ref': '',
        'data-footnote-id': id,
        class: 'autodown-footnote-ref',
      }),
      `[^${id}]`,
    ]
  },

  markdownTokenName: 'footnoteRef',

  parseMarkdown(token, helpers) {
    return helpers.createNode('footnoteRef', { id: token.id as string })
  },

  renderMarkdown(node) {
    return `[^${(node.attrs?.id as string) || ''}]`
  },

  markdownTokenizer: {
    name: 'footnoteRef',
    level: 'inline',
    start(src) {
      const idx = src.indexOf('[^')
      return idx === -1 ? -1 : idx
    },
    tokenize(src) {
      const match = src.match(/^\[\^([^\]\n]+)\]/)
      if (!match) return undefined
      return { type: 'footnoteRef', raw: match[0], id: match[1] }
    },
  },
})

export const FootnoteDef = Node.create({
  name: 'footnoteDef',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-footnote-id') || '',
        renderHTML: (attributes) => ({ 'data-footnote-id': attributes.id as string }),
      },
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-footnote-text') || element.textContent || '',
        renderHTML: (attributes) => ({ 'data-footnote-text': attributes.text as string }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-footnote-def]',
        getAttrs: (element) => ({
          id: element.getAttribute('data-footnote-id') || '',
          text: element.getAttribute('data-footnote-text') || element.textContent || '',
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const id = (node.attrs.id as string) || ''
    const text = (node.attrs.text as string) || ''
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
        'data-footnote-def': '',
        'data-footnote-id': id,
        'data-footnote-text': text,
        class: 'autodown-footnote-def',
      }),
      `[^${id}]: ${text}`,
    ]
  },

  markdownTokenName: 'footnoteDef',

  parseMarkdown(token, helpers) {
    return helpers.createNode('footnoteDef', {
      id: token.id as string,
      text: token.text as string,
    })
  },

  renderMarkdown(node) {
    const id = (node.attrs?.id as string) || ''
    const text = (node.attrs?.text as string) || ''
    return `[^${id}]: ${text}`
  },

  markdownTokenizer: {
    name: 'footnoteDef',
    level: 'block',
    start(src) {
      return src.startsWith('[^') ? 0 : -1
    },
    tokenize(src) {
      const match = src.match(/^\[\^([^\]\n]+)\]:\s*(.*?)\s*(?:\n|$)/)
      if (!match) return undefined
      return {
        type: 'footnoteDef',
        raw: match[0],
        id: match[1],
        text: match[2],
      }
    },
  },
})
