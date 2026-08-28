// One-off builder for search-fixtures.json (Plan 022 slice 5).
// Expected snippets are hand-derived from the search.at contract:
//   - needle = asciiLower(trim(query)); empty needle / limit <= 0 → []
//   - case-insensitive substring match (ASCII fold), non-overlapping scan
//   - page hit: title match first for the snippet, else frontmatter
//   - snippet window: first match, left 60 chars snapped forward to a word
//     start, right 120 chars snapped back to a word end, "…" on each clip
//   - order: pages before blocks, occurrences desc, path asc, uuid asc,
//     blockId asc (fully deterministic, input order irrelevant)
// Run: node tests/build-search-fixtures.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const open = '\u0001'
const close = '\u0001'
const ellipsis = '…'

const page = (path, title, frontmatter) => ({ path, title, frontmatter })
const block = (uuid, pagePath, content, blockId = '') => ({ uuid, pagePath, blockId, content })
const pageHit = (path, title, snippet) => ({
  isPage: true, path, title, uuid: '', blockId: '', content: '', snippet,
})
const blockHit = (uuid, pagePath, content, snippet, blockId = '') => ({
  isPage: false, path: pagePath, title: '', uuid, blockId, content, snippet,
})

// C8: prefix 50×"ab " (150 chars) + NEEDLE (150..156) + 50×" cd" (156..306).
// start = 150-60 = 90 → snap forward over "ab" to the space at 92, skip it → 93
// (19×"ab " before the needle). end = min(306, 156+120) = 276; suffix char 120
// is the space at 276 → stop; charAt(275) = 'd' → no trailing trim (40×" cd").
const c8Content = 'ab '.repeat(50) + 'NEEDLE' + ' cd'.repeat(50)
const c8Snippet =
  ellipsis + 'ab '.repeat(19) + open + 'NEEDLE' + close + ' cd'.repeat(40) + ellipsis

const cases = [
  {
    name: 'title-case-fold',
    pages: [page('Auto Down.ad', 'Auto Down', '{}')],
    blocks: [],
    query: 'AUTO',
    limit: 20,
    expected: [pageHit('Auto Down.ad', 'Auto Down', `${open}Auto${close} Down`)],
  },
  {
    name: 'cjk-substring-all-occurrences',
    pages: [],
    blocks: [block('u1', '市场.ad', '前门大桥正当前门')],
    query: '前门',
    limit: 20,
    expected: [
      blockHit('u1', '市场.ad', '前门大桥正当前门', `${open}前门${close}大桥正当${open}前门${close}`),
    ],
  },
  {
    name: 'pages-before-blocks-limit-truncation',
    pages: [page('a.ad', 'x here', '{}'), page('b.ad', 'x there', '{}')],
    blocks: [block('u1', 'a.ad', 'has x'), block('u2', 'b.ad', 'has x')],
    query: 'x',
    limit: 3,
    expected: [
      pageHit('a.ad', 'x here', `${open}x${close} here`),
      pageHit('b.ad', 'x there', `${open}x${close} there`),
      blockHit('u1', 'a.ad', 'has x', `has ${open}x${close}`),
    ],
  },
  {
    name: 'empty-query',
    pages: [page('a.ad', 'x', '{}')],
    blocks: [],
    query: '   ',
    limit: 20,
    expected: [],
  },
  {
    name: 'no-match',
    pages: [page('a.ad', 'x', '{}')],
    blocks: [],
    query: 'zzz',
    limit: 20,
    expected: [],
  },
  {
    name: 'occurrence-count-desc',
    pages: [],
    blocks: [block('u1', 'p.ad', 'hit once'), block('u2', 'q.ad', 'hit hit twice')],
    query: 'hit',
    limit: 20,
    expected: [
      blockHit('u2', 'q.ad', 'hit hit twice', `${open}hit${close} ${open}hit${close} twice`),
      blockHit('u1', 'p.ad', 'hit once', `${open}hit${close} once`),
    ],
  },
  {
    name: 'tie-path-then-uuid-asc',
    pages: [],
    blocks: [
      block('u1', 'b.ad', 'q here'),
      block('u2', 'a.ad', 'q here'),
      block('u0', 'a.ad', 'q here'),
    ],
    query: 'q',
    limit: 20,
    expected: [
      blockHit('u0', 'a.ad', 'q here', `${open}q${close} here`),
      blockHit('u2', 'a.ad', 'q here', `${open}q${close} here`),
      blockHit('u1', 'b.ad', 'q here', `${open}q${close} here`),
    ],
  },
  {
    name: 'long-content-window-ellipsis',
    pages: [],
    blocks: [block('w1', 'long.ad', c8Content)],
    query: 'needle',
    limit: 20,
    expected: [blockHit('w1', 'long.ad', c8Content, c8Snippet)],
  },
  {
    name: 'frontmatter-match-snippet',
    pages: [page('a.ad', 'Totally Different', '{"aliases":["SecretName"]}')],
    blocks: [],
    query: 'secretname',
    limit: 20,
    expected: [pageHit('a.ad', 'Totally Different', '{"aliases":["' + open + 'SecretName' + close + '"]}')],
  },
  {
    name: 'literal-regex-chars',
    pages: [],
    blocks: [block('r1', 'p.ad', 'foo (((')],
    query: '(((',
    limit: 20,
    expected: [blockHit('r1', 'p.ad', 'foo (((', `foo ${open}(((${close}`)],
  },
  {
    name: 'multi-word-literal-phrase',
    pages: [],
    blocks: [block('m1', 'p.ad', 'x foo bar y')],
    query: 'foo bar',
    limit: 20,
    expected: [blockHit('m1', 'p.ad', 'x foo bar y', `x ${open}foo bar${close} y`)],
  },
  {
    name: 'limit-zero',
    pages: [page('a.ad', 'x', '{}')],
    blocks: [],
    query: 'x',
    limit: 0,
    expected: [],
  },
  {
    name: 'page-count-ranking',
    pages: [page('one.ad', 'dup', '{}'), page('two.ad', 'dup dup', '{}')],
    blocks: [],
    query: 'dup',
    limit: 20,
    expected: [
      pageHit('two.ad', 'dup dup', `${open}dup${close} ${open}dup${close}`),
      pageHit('one.ad', 'dup', `${open}dup${close}`),
    ],
  },
  {
    name: 'title-snippet-priority',
    pages: [page('p.ad', 'Alpha Page', '{"note":"alpha here"}')],
    blocks: [],
    query: 'alpha',
    limit: 20,
    expected: [pageHit('p.ad', 'Alpha Page', `${open}Alpha${close} Page`)],
  },
  {
    name: 'query-trimmed',
    pages: [page('a.ad', 'x', '{}')],
    blocks: [],
    query: '  x  ',
    limit: 20,
    expected: [pageHit('a.ad', 'x', `${open}x${close}`)],
  },
]

writeFileSync(
  join(here, 'search-fixtures.json'),
  JSON.stringify({ marks: { open, close, ellipsis }, cases }, null, 2) + '\n',
)
console.log(`search-fixtures.json written — ${cases.length} cases`)
