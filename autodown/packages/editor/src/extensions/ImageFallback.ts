import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const ImageFallback = Extension.create({
  name: 'imageFallback',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imageFallback'),

        view(editorView) {
          const handleError = (e: Event) => {
            const target = e.target as HTMLElement | null
            if (target?.tagName === 'IMG') {
              target.closest('.autodown-image-wrapper')?.classList.add('autodown-image-fallback')
            }
          }

          editorView.dom.addEventListener('error', handleError, true)

          // Handle images that are already broken when the editor mounts
          queueMicrotask(() => {
            editorView.dom.querySelectorAll('.autodown-image-wrapper img').forEach((img) => {
              const el = img as HTMLImageElement
              if (!el.complete || el.naturalWidth === 0) {
                el.closest('.autodown-image-wrapper')?.classList.add('autodown-image-fallback')
              }
            })
          })

          return {
            update() {},
            destroy() {
              editorView.dom.removeEventListener('error', handleError, true)
            },
          }
        },
      }),
    ]
  },
})
