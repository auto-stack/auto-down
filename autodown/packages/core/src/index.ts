/**
 * AutoDown Core — Shared types and IAL (Inline Attribute List) utilities.
 */

export interface TableAttr {
  cols: (number | null)[]
  rows: (number | null)[]
}

const IAL_REGEX =
  /(\|[^\n]*\|[ \t]*\n\|[-:\| \t]+\|[ \t]*\n(?:\|[^\n]*\|[ \t]*\n)+)\{cols:\[(.*?)\](?:,\s*rows:\[(.*?)\])?\}[ \t]*(?:\n|$)/g

function parseValue(s: string): number | null {
  const trimmed = s.trim().replace(/^["']|["']$/g, '')
  if (trimmed === 'auto') return null
  const num = parseInt(trimmed, 10)
  return isNaN(num) ? null : num
}

function parseArray(s: string): (number | null)[] {
  return s.split(',').map(parseValue)
}

export function formatValue(v: number | null): string {
  return v === null ? '"auto"' : String(v)
}

export function formatArray(arr: (number | null)[]): string {
  return arr.map(formatValue).join(',')
}

export function hasAnyValue(arr: (number | null)[]): boolean {
  return arr.some((v) => v !== null)
}

/**
 * Extract IAL attributes from Markdown and return cleaned Markdown + attrs.
 */
export function preprocessMarkdown(md: string): { md: string; tableAttrs: TableAttr[] } {
  const tableAttrs: TableAttr[] = []

  const cleaned = md.replace(IAL_REGEX, (_match, _tableBody, colsStr, rowsStr) => {
    tableAttrs.push({
      cols: parseArray(colsStr),
      rows: rowsStr ? parseArray(rowsStr) : [],
    })
    return _tableBody
  })

  return { md: cleaned, tableAttrs }
}

/** Build IAL string from colwidth/rowheight arrays. */
export function buildIAL(
  colwidth: (number | null)[],
  rowheight: (number | null)[]
): string | null {
  const hasCols = hasAnyValue(colwidth)
  const hasRows = hasAnyValue(rowheight)
  if (!hasCols && !hasRows) return null

  const parts: string[] = []
  if (hasCols) parts.push(`cols:[${formatArray(colwidth)}]`)
  if (hasRows) parts.push(`rows:[${formatArray(rowheight)}]`)
  return '{' + parts.join(', ') + '}\n'
}
