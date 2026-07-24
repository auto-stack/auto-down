import { createFile, writeWiki } from './api'

export interface JournalConfig {
  fileNameFormat: string
  pageTitleFormat: string
}

const DEFAULT_CONFIG: JournalConfig = {
  fileNameFormat: 'yyyy_MM_dd',
  pageTitleFormat: 'MMM do, yyyy',
}

export function getJournalConfig(): JournalConfig {
  // TODO: read workspace config once a config file / API is available.
  return DEFAULT_CONFIG
}

const ORDINALS = ['th', 'st', 'nd', 'rd']

function ordinal(n: number): string {
  const v = n % 100
  return `${n}${ORDINALS[(v - 20) % 10] || ORDINALS[v] || ORDINALS[0]}`
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatDate(date: Date, format: string): string {
  const tokens: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    yy: String(date.getFullYear()).slice(-2),
    MMMM: MONTH_FULL[date.getMonth()],
    MMM: MONTH_SHORT[date.getMonth()],
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    M: String(date.getMonth() + 1),
    dd: String(date.getDate()).padStart(2, '0'),
    d: String(date.getDate()),
    do: ordinal(date.getDate()),
    EEEE: WEEKDAY_FULL[date.getDay()],
    EEE: WEEKDAY_SHORT[date.getDay()],
    HH: String(date.getHours()).padStart(2, '0'),
    H: String(date.getHours()),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
  }

  // Replace longest tokens first so "yyyy" wins over "yy".
  const pattern = new RegExp(Object.keys(tokens).sort((a, b) => b.length - a.length).join('|'), 'g')
  return format.replace(pattern, (match) => tokens[match] ?? match)
}

export function todayDate(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function getDailyNotePath(date = todayDate(), config = getJournalConfig()): string {
  const fileName = formatDate(date, config.fileNameFormat)
  return `journals/${fileName}.ad`
}

export function getDailyNoteTitle(date = todayDate(), config = getJournalConfig()): string {
  return formatDate(date, config.pageTitleFormat)
}

function defaultDailyBody(title: string, date: Date): string {
  const iso = formatDate(date, 'yyyy-MM-dd')
  const weekday = formatDate(date, 'EEEE')
  return `---\ntitle: "${title}"\ncreated_at: "${iso}"\nupdated_at: "${iso}"\nday: "${weekday}"\n---\n\n## ${title}\n\n- ` + '\n'
}

function findNodeByPath(nodes: any[], path: string): any | undefined {
  for (const n of nodes) {
    if (n.path === path) return n
    if (n.children) {
      const found = findNodeByPath(n.children, path)
      if (found) return found
    }
  }
  return undefined
}

export async function openDailyNote(
  date: Date,
  tabs: { open: (path: string, title?: string) => Promise<void> },
  fileTree: { files: any[]; load: () => Promise<void> },
) {
  const config = getJournalConfig()
  const path = getDailyNotePath(date, config)
  const title = getDailyNoteTitle(date, config)

  const exists = !!findNodeByPath(fileTree.files, path)
  if (!exists) {
    await createFile(path, false)
    await writeWiki(path, {
      frontmatter: { title, created_at: formatDate(date, 'yyyy-MM-dd'), updated_at: formatDate(date, 'yyyy-MM-dd') },
      body: defaultDailyBody(title, date),
    })
    await fileTree.load()
  }

  await tabs.open(path, title)
}

const DEFAULT_STEM_RE = /^(\d{4})_(\d{2})_(\d{2})$/

export function parseDailyDateFromPath(path: string): Date | null {
  const stem = path.replace(/^journals\//, '').replace(/\.ad$/, '')
  const match = stem.match(DEFAULT_STEM_RE)
  if (!match) return null
  const [_, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (isNaN(date.getTime())) return null
  return date
}

export function openAdjacentDailyNote(
  direction: -1 | 1,
  currentPath: string,
  tabs: { open: (path: string, title?: string) => Promise<void> },
  fileTree: { files: any[]; load: () => Promise<void> },
) {
  const date = parseDailyDateFromPath(currentPath)
  if (!date) return
  const next = new Date(date)
  next.setDate(date.getDate() + direction)
  return openDailyNote(next, tabs, fileTree)
}
