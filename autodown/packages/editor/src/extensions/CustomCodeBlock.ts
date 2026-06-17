import { mergeAttributes } from '@tiptap/core'
import { CodeBlockLowlight, type CodeBlockLowlightOptions } from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

/**
 * CustomCodeBlock — extends Tiptap's CodeBlockLowlight to add a
 * `data-language` attribute on the `<pre>` element, syntax highlighting,
 * and a clickable language badge for switching languages.
 */
const lowlight = createLowlight(common)

export const CustomCodeBlock = CodeBlockLowlight.extend<CodeBlockLowlightOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight,
      defaultLanguage: 'text',
      languageClassPrefix: 'language-',
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      enableTabIndentation: false,
      tabSize: 4,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      language: {
        default: 'text',
        parseHTML: (element) => {
          const cls = element.getAttribute('class')
          const match = cls?.match(/language-(\S+)/)
          return match ? match[1] : 'text'
        },
        renderHTML: (attributes) => {
          const language = attributes.language || 'text'
          return {
            'data-language': language,
            class: `language-${language}`,
          }
        },
      },
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const language = (node.attrs.language as string) || 'text'
    const extraAttrs = language
      ? { 'data-language': language }
      : {}

    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, extraAttrs),
      [
        'div',
        {
          class: 'codeblock-language-badge',
          'data-codeblock-language-badge': language,
        },
        language,
      ],
      [
        'code',
        {
          class: language
            ? this.options.languageClassPrefix + language
            : null,
        },
        0,
      ],
    ]
  },
})
