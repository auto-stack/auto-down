import { mergeAttributes } from '@tiptap/core'
import { CodeBlockLowlight, type CodeBlockLowlightOptions } from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { actionIcons, getLanguageIconUrl, getLanguageLabel } from '../utils/codeBlockLanguage'

/**
 * CustomCodeBlock — extends Tiptap's CodeBlockLowlight to add a
 * `data-language` attribute on the `<pre>` element, syntax highlighting,
 * and a header bar matching the preview renderer.
 */
const lowlight = createLowlight(common)

export const CustomCodeBlock = CodeBlockLowlight.extend<CodeBlockLowlightOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight,
      defaultLanguage: 'text',
      languageClassPrefix: 'language-',
      exitOnTripleEnter: false,
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
        { class: 'code-block-header' },
        [
          'div',
          {
            class: 'code-header-main',
            'data-codeblock-language-badge': language,
            'data-language': language,
          },
          [
            'img',
            {
              class: 'icon-slot',
              src: getLanguageIconUrl(language),
              alt: language,
              width: 16,
              height: 16,
            },
          ],
          [
            'div',
            { class: 'code-header-copy' },
            [
              'div',
              { class: 'code-header-title' },
              getLanguageLabel(language),
            ],
            [
              'img',
              {
                class: 'code-header-edit-icon',
                src: actionIcons.edit,
                alt: 'edit',
                width: 12,
                height: 12,
              },
            ],
          ],
        ],
        [
          'div',
          { class: 'code-block-actions' },
          [
            'button',
            {
              type: 'button',
              class: 'code-action-btn code-action-expand',
              'data-codeblock-expand-btn': '',
              title: '展开 / 收起',
            },
            [
              'img',
              {
                src: actionIcons.expand,
                alt: 'expand',
                width: 16,
                height: 16,
              },
            ],
          ],
          [
            'button',
            {
              type: 'button',
              class: 'code-action-btn code-action-copy',
              'data-codeblock-copy-btn': '',
              title: '复制',
            },
            [
              'img',
              {
                src: actionIcons.copy,
                alt: 'copy',
                width: 14,
                height: 14,
              },
            ],
          ],
          [
            'button',
            {
              type: 'button',
              class: 'code-action-btn code-action-more',
              'data-codeblock-more-btn': '',
              title: '更多',
            },
            [
              'img',
              {
                src: actionIcons.more,
                alt: 'more',
                width: 16,
                height: 16,
              },
            ],
          ],
        ],
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
