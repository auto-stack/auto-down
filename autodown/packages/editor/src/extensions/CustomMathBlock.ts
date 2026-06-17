import { mergeAttributes, Node, textblockTypeInputRule, type CommandProps } from '@tiptap/core'

/**
 * CustomMathBlock — block-level KaTeX math formula.
 *
 * Markdown syntax:
 *   $$
 *   E = mc^2
 *   $$
 *
 * The LaTeX source is stored as plain text content. The preview renderer
 * (markstream-vue) handles $$...$$ natively via MathBlockNode once KaTeX is
 * enabled.
 */
export const CustomMathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-math-block]',
        preserveWhitespace: 'full',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-math-block': '',
        class: 'autodown-math-block',
      }),
      ['pre', ['code', { class: 'math-block-source' }, 0]],
    ]
  },

  markdownTokenName: 'mathBlock',

  parseMarkdown: (token, helpers) => {
    const text = (token.text as string) || ''
    return helpers.createNode(
      'mathBlock',
      {},
      text ? [helpers.createTextNode(text)] : []
    )
  },

  renderMarkdown: (node, helpers) => {
    const text = helpers.renderChildren(node.content || [])
    return `$$\n${text}\n$$`
  },

  markdownTokenizer: {
    name: 'mathBlock',
    level: 'block',
    start(src) {
      return src.startsWith('$$\n') ? 0 : -1
    },
    tokenize(src) {
      if (!src.startsWith('$$\n')) return undefined

      const closeIndex = src.indexOf('\n$$', 3)
      if (closeIndex === -1) return undefined

      const text = src.slice(3, closeIndex)
      const raw = src.slice(0, closeIndex + 3)

      return {
        type: 'mathBlock',
        raw,
        text,
      }
    },
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^\$\$\s$/,
        type: this.type,
      }),
    ]
  },

  addCommands() {
    return {
      setMathBlock:
        () =>
        ({ commands }: CommandProps) => {
          return commands.setNode(this.name)
        },
      toggleMathBlock:
        () =>
        ({ commands }: CommandProps) => {
          return commands.toggleNode(this.name, 'paragraph')
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      /**
       * Set the current block to a math block.
       */
      setMathBlock: () => ReturnType
      /**
       * Toggle the current block between math block and paragraph.
       */
      toggleMathBlock: () => ReturnType
    }
  }
}
