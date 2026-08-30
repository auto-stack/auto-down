// Shared content-hash algorithm for the dist freshness guard (plan 027 D2).
// Both write-dist-stamp.mjs and assert-dist-fresh.mjs import this module, so
// the writer and the checker can never drift apart.
//
// Hash scope: everything that feeds the build output —
//   src/**  (*.ts / *.vue / *.css)
//   auto/** (*.at + *.ts, excluding *.raw.ts mirrors and gen/ or _stage/
//            staging dirs produced mid-generation)
// Files are sorted by repo-relative posix path, then fed as
// (path + '\0' + content) into sha256. mtime is deliberately ignored —
// frequent git worktree/fold/switch operations would trip an mtime guard.
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const SRC_EXT = new Set(['.ts', '.vue', '.css'])
const AUTO_EXT = new Set(['.at', '.ts'])
const EXCLUDED_DIR_SEGMENTS = new Set(['node_modules', 'gen', '_stage'])

function hasExcludedSegment(relPath) {
  return relPath.some((seg) => EXCLUDED_DIR_SEGMENTS.has(seg))
}

async function collect(dir, exts, out) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return // missing dir contributes nothing; assert side fails on missing stamp
  }
  for (const entry of entries) {
    const rel = relative(pkgRoot, join(dir, entry.name)).split('\\').join('/').split('/')
    if (hasExcludedSegment(rel)) continue
    if (entry.isDirectory()) {
      await collect(join(dir, entry.name), exts, out)
    } else if (entry.isFile() && exts.has(extname(entry.name))) {
      out.push(rel.join('/'))
    }
  }
}

export async function computeStamp() {
  const rels = []
  await collect(join(pkgRoot, 'src'), SRC_EXT, rels)
  await collect(join(pkgRoot, 'auto'), AUTO_EXT, rels)
  rels.sort()
  const hash = createHash('sha256')
  for (const rel of rels) {
    if (rel.endsWith('.raw.ts')) continue // gen-input mirrors, not products
    hash.update(rel)
    hash.update('\0')
    hash.update(await readFile(join(pkgRoot, rel)))
  }
  return hash.digest('hex')
}
