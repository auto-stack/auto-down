import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

export const CustomImage = Image.extend({
  renderHTML({ node, HTMLAttributes }) {
    const alt = (node.attrs.alt as string) || ''
    return [
      'span',
      { class: 'autodown-image-wrapper', 'data-alt': alt },
      ['img', mergeAttributes(HTMLAttributes, { class: 'autodown-image', alt })],
    ]
  },
})
