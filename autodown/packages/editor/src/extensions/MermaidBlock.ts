import { mergeAttributes, Node, type CommandProps } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MermaidNodeView from '../node-views/MermaidNodeView.vue'

export interface MermaidBlockAttrs {
  text: string
}

export const MermaidBlock = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-mermaid-source') || element.textContent || '',
        renderHTML: (attributes) => ({ 'data-mermaid-source': attributes.text as string }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-mermaid-block]',
        preserveWhitespace: 'full',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const text = (node.attrs.text as string) || ''
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes ?? {}, HTMLAttributes, {
        'data-mermaid-block': '',
        'data-mermaid-source': text,
        class: 'autodown-mermaid-block',
      }),
      ['pre', ['code', { class: 'mermaid-source' }, 0]],
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(MermaidNodeView as any)
  },

  markdownTokenName: 'mermaidBlock',

  parseMarkdown(token, helpers) {
    const text = (token.text as string) || ''
    return helpers.createNode(
      'mermaidBlock',
      { text },
      text ? [helpers.createTextNode(text)] : []
    )
  },

  renderMarkdown(node, helpers) {
    const text = helpers.renderChildren(node.content || [])
    return `\`\`\`mermaid\n${text}\n\`\`\``
  },

  markdownTokenizer: {
    name: 'mermaidBlock',
    level: 'block',
    start(src) {
      return src.startsWith('```mermaid\n') ? 0 : -1
    },
    tokenize(src) {
      const opener = '```mermaid\n'
      if (!src.startsWith(opener)) return undefined
      const closeIndex = src.indexOf('\n```', opener.length)
      if (closeIndex === -1) return undefined
      const text = src.slice(opener.length, closeIndex)
      const raw = src.slice(0, closeIndex + 4)
      return {
        type: 'mermaidBlock',
        raw,
        text,
      }
    },
  },

  addCommands() {
    return {
      setMermaidBlock:
        () =>
        ({ commands }: CommandProps) => {
          return commands.setNode(this.name)
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaidBlock: {
      setMermaidBlock: () => ReturnType
    }
  }
}
