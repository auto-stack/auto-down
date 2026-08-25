import type { Component } from 'vue'
import type { Editor, Range } from '@tiptap/core'

export interface SlashItem {
  title: string
  description: string
  icon: Component
  searchTerms: string[]
  command: (ctx: { editor: Editor; range: Range }) => void
}
