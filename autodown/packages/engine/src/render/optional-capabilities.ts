// Optional heavy capabilities (plan 008, goal 3): katex / mermaid / syntax
// highlighting become opt-in registrations instead of unconditional
// dependencies. The parse subset (auto/markdown_parser.at) does not emit
// math / mermaid nodes yet (whitelisted), so these entries currently only
// record intent; when the subset grows, renderers are injected here and the
// library keeps working (degraded plain rendering) when they are absent.
//
// The highlight implementation slot itself lives in highlight.ts (the
// platform bridge); enableHighlight just flips the switch and optionally
// binds an implementation in the same call.

import { setHighlightImpl, type HighlightFn } from './highlight'

export type { HighlightFn } from './highlight'

export type NodeRendererFactory = () => unknown

interface CapabilityEntry {
  enabled: boolean
  factory?: NodeRendererFactory
}

const registry: Record<string, CapabilityEntry> = {}

function setEntry(name: string, enabled: boolean, factory?: NodeRendererFactory): void {
  registry[name] = { enabled, factory }
}

/** Register (or clear) the katex renderer. Calling without a factory marks
 *  the capability enabled with the library default (when it grows in). */
export function enableKatex(factory?: NodeRendererFactory): void {
  setEntry('katex', true, factory)
}

/** Register (or clear) the mermaid renderer. */
export function enableMermaid(factory?: NodeRendererFactory): void {
  setEntry('mermaid', true, factory)
}

/** Register (or clear) the syntax highlighter. The optional argument is the
 *  platform implementation (see highlight.ts for the contract): a VM backend
 *  supplies its own bridge, the Vue layer calls enableHighlight() with no
 *  argument and the lowlight default is resolved at the call site. */
export function enableHighlight(impl?: HighlightFn): void {
  setEntry('highlight', true)
  setHighlightImpl(impl ?? null)
}

export function isCapabilityEnabled(name: string): boolean {
  return registry[name]?.enabled === true
}

/** All capabilities absent -> the renderer still works (degraded path). */
export function clearOptionalCapabilities(): void {
  for (const key of Object.keys(registry)) {
    delete registry[key]
  }
  setHighlightImpl(null)
}
