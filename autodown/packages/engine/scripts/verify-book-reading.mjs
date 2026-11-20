import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'

const [booksArg, parserArg, nativeArg, workFilter] = process.argv.slice(2)
if (!booksArg || !parserArg || !nativeArg) {
  throw new Error('usage: node scripts/verify-book-reading.mjs <books-repo> <prepared-parser-module> <prepared-native-example> [work]')
}
const books = realpathSync(booksArg)
const { locateBookTarget, parseBookChapter, projectBookChapter, serializeBookChapter } = await import(
  pathToFileURL(resolve(parserArg)).href
)
const executable = resolve(nativeArg)
const sameBytes = (actual, expected, reason) => {
  if (!actual.equals(expected)) assert.deepEqual(actual, expected, reason)
}
const json = (path) => JSON.parse(readFileSync(path, 'utf8'))
const index = json(join(books, 'books', 'index.json'))
assert.equal(index.edition, 'pilot-03')
const total = { chapters: 0, frontmatter: 0, cards: 0, paragraphs: 0, spans: 0, nonLearning: 0 }
const works = index.books.filter(({ book }) => !workFilter || workFilter === book)
assert(works.length, `unknown work ${workFilter}`)
const readNative = (input) => new Promise((resolve, reject) => {
  const child = spawn(executable, ['--batch'], { windowsHide: true })
  const chunks = []
  const stderr = []
  child.stdout.on('data', chunk => chunks.push(chunk))
  child.stderr.on('data', chunk => stderr.push(chunk))
  child.stdin.on('error', reject)
  child.on('error', reject)
  child.on('close', status => {
    if (status !== 0) reject(new Error(`native book reader exited ${status}: ${Buffer.concat(stderr)}`))
    else resolve(Buffer.concat(chunks))
  })
  child.stdin.end(input)
})

const verifyWork = async (summary) => {
  const t = performance.now()
  const base = join(books, 'books', summary.book)
  const { chapters, frontmatter } = json(join(base, 'book.json'))
  const entries = frontmatter ? [frontmatter, ...chapters] : chapters
  const input = entries.map(entry => `${entry.id ?? ''}\t${join(base, entry.sourceFile)}\n`).join('')
  const native = await readNative(input)
  let cursor = 0
  const field = () => {
    const end = cursor + 4 + native.readUInt32LE(cursor)
    const bytes = native.subarray(cursor + 4, end)
    assert(end <= native.length, 'truncated native result')
    cursor = end
    return bytes
  }
  const string = () => field().toString('utf8')
  const counts = { paragraphs: 0, spans: 0, cards: 0, nonLearning: 0 }
  for (const entry of entries) {
    const id = `${summary.book}/${entry.sourceFile}`
    const source = readFileSync(join(base, entry.sourceFile), 'utf8')
    const expected = readFileSync(join(base, entry.file))
    const parsed = parseBookChapter(source, entry.id ?? '', true)
    sameBytes(Buffer.from(parsed.markdown), expected, `Web chapter: ${id}`)
    sameBytes(field(), expected, `native chapter: ${id}`)
    assert.equal(serializeBookChapter(parsed), source, `source round trip: ${id}`)
    const paragraphs = parsed.targets.filter(target => target.kind === 'paragraph').length
    const spans = parsed.targets.filter(target => target.kind === 'span').length
    assert.equal(Number(string()), paragraphs, `native paragraphs: ${id}`)
    assert.equal(Number(string()), spans, `native spans: ${id}`)
    counts.paragraphs += paragraphs
    counts.spans += spans
    assert.deepEqual(parsed.diagnostics, [], `Web diagnostics: ${id}`)
    const diagnostics = Array.from({ length: Number(string()) }, string)
    assert.deepEqual(diagnostics, [], `native diagnostics: ${id}`)
    const sections = entry.sections ?? []
    const cards = sections.filter(section => section.learn)
    counts.cards += cards.length
    for (const section of sections.filter(section => !section.learn)) {
      const [first, last] = section.sourceTargets
      const start = locateBookTarget(parsed, first)
      const end = locateBookTarget(parsed, last)
      assert(start && end, `non-learning source anchor: ${section.id}`)
      const [lo, hi] = section.markdownRange
      sameBytes(Buffer.from(parsed.markdown.slice(start.start, end.end)),
        expected.subarray(lo, hi), `non-learning reading: ${section.id}`)
      assert.equal(projectBookChapter(parsed, section.id), null)
      counts.nonLearning++
    }
    assert.equal(Number(string()), cards.length, `native card count: ${id}`)
    assert.equal(parsed.cards.length, cards.length, `Web card count: ${id}`)
    for (const [i, card] of cards.entries()) {
      const description = `${id} ${card.id}`
      const [start, end] = card.markdownRange
      const bytes = expected.subarray(start, end)
      const webCard = projectBookChapter(parsed, card.id)
      assert.equal(parsed.cards[i].id, card.id, `Web card order: ${description}`)
      assert.equal(webCard?.title, card.title, `Web card title: ${description}`)
      sameBytes(Buffer.from(webCard.markdown), bytes, `Web card text: ${description}`)
      assert.equal(string(), card.id, `native card order: ${description}`)
      assert.equal(string(), card.title, `native card title: ${description}`)
      sameBytes(field(), bytes, `native card text: ${description}`)
    }
  }
  assert.equal(cursor, native.length, 'unexpected extra native output')
  assert.equal(chapters.length, summary.chapters)
  assert.equal(Number(Boolean(frontmatter)), summary.frontmatterFiles)
  assert.deepEqual(counts, {
    paragraphs: summary.paragraphIds,
    spans: summary.spanIds,
    cards: summary.cards,
    nonLearning: summary.nonLearningSections,
  }, summary.book)
  return { ...counts, chapters: chapters.length, frontmatter: Number(Boolean(frontmatter)),
    seconds: (performance.now() - t) / 1000 }
}

const started = performance.now()
for (let i = 0; i < works.length; i += 3) {
  const batch = works.slice(i, i + 3)
  const reports = await Promise.all(batch.map(verifyWork))
  for (const [index, { seconds, ...counts }] of reports.entries()) {
    for (const key of Object.keys(counts)) total[key] += counts[key]
    console.log(batch[index].book, JSON.stringify(counts), `${seconds.toFixed(3)} s`)
  }
}
if (!workFilter) assert.deepEqual(total, {
  chapters: 1594, frontmatter: 11, cards: 8946, paragraphs: 26796, spans: 3697, nonLearning: 19,
})
console.log(JSON.stringify(total), `${((performance.now() - started) / 1000).toFixed(3)} s`)
