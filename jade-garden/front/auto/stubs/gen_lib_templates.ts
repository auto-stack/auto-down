// gen_lib_templates.ts — gen-project stub for '@/lib/templates'.
//
// Mirrored into gen/front/vue/src/lib/templates.ts by the widget Regenerate
// flow so the editor_tab extension (which re-exports findTemplates /
// stripFrontmatter / expandTemplate via the dual-resolution relative path)
// type-checks inside the self-contained gen project. NEVER SHIPS.

export interface TemplateContext {
  currentPageTitle?: string | null
  now?: Date
}

export interface TemplateInfo {
  name: string
  path: string
}

export function findTemplates(_nodes: any[]): TemplateInfo[] {
  return []
}

export function stripFrontmatter(body: string): string {
  return body
}

export function expandTemplate(body: string, _context: TemplateContext = {}): string {
  return body
}
