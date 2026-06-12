import { mergeAttributes } from '@tiptap/core'
import { CodeBlock } from '@tiptap/extension-code-block'

/**
 * CustomCodeBlock — extends tiptap's built-in CodeBlock to add a
 * `data-language` attribute on the `<pre>` element.
 *
 * This is purely a render-time change — no ProseMirror plugins, no
 * decorations, no DOM mutations. The language badge is rendered via
 * CSS ::before pseudo-element (see `autodown-editor.css`).
 *
 * This avoids the performance issues that come with decoration plugins
 * which recalculate on every state change.
 */
export const CustomCodeBlock = CodeBlock.extend({
  renderHTML({ node, HTMLAttributes }) {
    const language = (node.attrs.language as string) || ''
    const extraAttrs = language
      ? { 'data-language': language }
      : {}

    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, extraAttrs),
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
