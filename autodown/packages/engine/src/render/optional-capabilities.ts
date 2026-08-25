// Optional heavy capabilities (plan 008, goal 3): katex / mermaid / syntax
// highlighting become opt-in registrations instead of unconditional
// dependencies. The parse subset (auto/markdown_parser.at) does not emit
// math / mermaid nodes yet (whitelisted), so these entries currently only
// record intent; when the subset grows, renderers are injected here and the
// library keeps working (degraded plain rendering) when they are absent.

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

/** Register (or clear) the syntax highlighter. */
export function enableHighlight(factory?: NodeRendererFactory): void {
  setEntry('highlight', true, factory)
}

export function isCapabilityEnabled(name: string): boolean {
  return registry[name]?.enabled === true
}

/** All capabilities absent -> the renderer still works (degraded path). */
export function clearOptionalCapabilities(): void {
  for (const key of Object.keys(registry)) {
    delete registry[key]
  }
}
