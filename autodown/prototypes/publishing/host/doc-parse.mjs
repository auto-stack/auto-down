// PLAN-082 — .ad → 文档模型（复用 @autodown/engine 的现有 parser，不再实现第二套解析）
//
// 输入：一份 .ad 正文（可选 YAML 风格 frontmatter）
// 输出：{ meta, blocks, diagnostics } —— 供 host/wire.mjs 编码成 doc-wire v1 交给 Auto 模板求值
//
// 边界：parser 出口是 engine 的冻结合同（ARCHITECTURE.md §2），这里只消费 dist/parser.js，
// 不修改 parser/serializer。frontmatter 由适配层剥离为文档元数据（Design 10 §4.2），
// 未知键保留在 meta.extra 并给出诊断，不静默丢弃。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '../../../..');
const ENGINE_PARSER_PATH = path.join(REPO_ROOT, 'autodown/packages/engine/dist/parser.js');

let engineParser = null;

export async function loadEngineParser() {
  if (engineParser) return engineParser;
  try {
    engineParser = await import(pathToFileURL(ENGINE_PARSER_PATH).href);
  } catch (err) {
    const error = new Error(
      `cannot load @autodown/engine parser from ${ENGINE_PARSER_PATH}: ${err.message}. ` +
        'Build it first: pnpm --filter @autodown/engine build',
    );
    error.code = 'E_ENGINE_PARSER';
    throw error;
  }
  return engineParser;
}

// ---------------------------------------------------------------------------
// frontmatter（只支持本原型用到的标量键；未知键保留并诊断）
// ---------------------------------------------------------------------------

const META_KEYS = new Set(['title', 'author', 'authors', 'abstract', 'lang', 'date']);

export function splitFrontmatter(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { meta: {}, body: normalized, unknownKeys: [] };
  }
  const end = normalized.indexOf('\n---', 4);
  if (end < 0) {
    const error = new Error('frontmatter opened with --- but never closed');
    error.code = 'E_FRONTMATTER';
    throw error;
  }
  const raw = normalized.slice(4, end);
  const rest = normalized.slice(end + 4).replace(/^\n/, '');
  const meta = {};
  const unknownKeys = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const at = line.indexOf(':');
    if (at < 0) {
      const error = new Error(`frontmatter line is not "key: value": ${line}`);
      error.code = 'E_FRONTMATTER';
      throw error;
    }
    const key = line.slice(0, at).trim().toLowerCase();
    const value = line.slice(at + 1).trim();
    if (!META_KEYS.has(key)) {
      unknownKeys.push(key);
      meta[key] = value;
      continue;
    }
    if (key === 'author' || key === 'authors') {
      const authors = value
        .split(/[,，;；]/)
        .map((s) => s.trim())
        .filter(Boolean);
      meta.authors = (meta.authors ?? []).concat(authors);
    } else {
      meta[key] = value;
    }
  }
  return { meta, body: rest, unknownKeys };
}

// ---------------------------------------------------------------------------
// 块模型遍历
// ---------------------------------------------------------------------------

function attrValue(node, key, fallback) {
  const attr = (node.attrs ?? []).find((a) => a.key === key);
  if (!attr) return fallback;
  const value = attr.value;
  if (!value || typeof value !== 'object') return fallback;
  if (value._tag === 'Bool') return value.value ? 1 : 0;
  if (value._tag === 'Int') return value.value;
  if (value._tag === 'Str') return value.value;
  return fallback;
}

function inlineText(node) {
  return (node.inlines ?? []).map((span) => span.text ?? '').join('');
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function countMarks(node) {
  let marks = 0;
  for (const span of node.inlines ?? []) {
    if ((span.marks ?? []).length > 0) marks += 1;
  }
  for (const child of node.children ?? []) marks += countMarks(child);
  return marks;
}

function paragraphTexts(node) {
  const out = [];
  for (const child of node.children ?? []) {
    // ListItem / Callout 的子块是 Paragraph（kind=1）
    if (child.kind === 1) {
      const text = normalizeText(inlineText(child));
      if (text !== '') out.push(text);
    }
  }
  return out;
}

/**
 * @param {string} absPath
 * @returns {Promise<{meta: object, blocks: object[], diagnostics: object[], relSource: string}>}
 */
export async function parseSource(absPath) {
  const parser = await loadEngineParser();
  const { BlockType, parse_blocks: parseBlocks } = parser;
  const text = readFileSync(absPath, 'utf8');
  const { meta: fm, body, unknownKeys } = splitFrontmatter(text);

  const diagnostics = [];
  for (const key of unknownKeys) {
    diagnostics.push({ code: 'W_FRONTMATTER_UNKNOWN_KEY', key, detail: 'preserved in document metadata' });
  }

  const root = parseBlocks(body, true);
  const blocks = [];
  const unsupported = [];
  const kindName = (kind) => BlockType[kind] ?? `Unknown(${kind})`;

  for (const node of root.children ?? []) {
    const id = node.id;
    const kind = kindName(node.kind);
    const marks = countMarks(node);
    if (marks > 0) {
      diagnostics.push({
        code: 'W_INLINE_MARKS_FLATTENED',
        node_id: id,
        count: marks,
        detail: 'publication-ir-v0 carries block text only; inline marks are flattened',
      });
    }
    if (kind === 'Heading') {
      const level = Number(attrValue(node, 'level', 1)) || 1;
      const text = normalizeText(inlineText(node));
      if (text === '') {
        unsupported.push({ id, kind, reason: 'empty heading' });
        continue;
      }
      blocks.push({ id, kind: 'heading', level: Math.min(Math.max(level, 1), 6), text });
    } else if (kind === 'Paragraph') {
      const text = normalizeText(inlineText(node));
      if (text !== '') blocks.push({ id, kind: 'paragraph', text });
    } else if (kind === 'ListBlock') {
      const ordered = Number(attrValue(node, 'ordered', 0)) === 1;
      const items = [];
      for (const item of node.children ?? []) {
        if (kindName(item.kind) !== 'ListItem') {
          unsupported.push({ id: item.id, kind: kindName(item.kind), reason: 'list child is not ListItem' });
          continue;
        }
        const nested = (item.children ?? []).filter((c) => kindName(c.kind) !== 'Paragraph');
        if (nested.length > 0) {
          unsupported.push({
            id: item.id,
            kind: 'ListItem(nested)',
            reason: 'nested list blocks are not in the prototype whitelist',
          });
          continue;
        }
        const itemText = paragraphTexts(item).join(' ');
        if (itemText === '') {
          unsupported.push({ id: item.id, kind: 'ListItem', reason: 'empty list item' });
          continue;
        }
        items.push(itemText);
      }
      if (items.length === 0) {
        unsupported.push({ id, kind, reason: 'list has no renderable items' });
        continue;
      }
      blocks.push({ id, kind: 'list', ordered, items });
    } else if (kind === 'Table') {
      const rows = [];
      for (const row of node.children ?? []) {
        const cells = (row.children ?? []).map((cell) => normalizeText(inlineText(cell)));
        if (cells.length === 0) continue;
        rows.push(cells);
      }
      if (rows.length === 0) {
        unsupported.push({ id, kind, reason: 'table has no rows' });
        continue;
      }
      const cols = rows[0].length;
      if (rows.some((row) => row.length !== cols)) {
        unsupported.push({ id, kind, reason: 'ragged table rows' });
        continue;
      }
      blocks.push({ id, kind: 'table', cols, rows });
    } else if (kind === 'ThematicBreak') {
      blocks.push({ id, kind: 'thematic_break' });
    } else if (kind === 'Callout') {
      const ctype = String(attrValue(node, 'type', 'note'));
      const title = normalizeText(String(attrValue(node, 'title', '')));
      const body_ = paragraphTexts(node);
      if (body_.length === 0) {
        unsupported.push({ id, kind, reason: 'callout has no paragraph body' });
        continue;
      }
      blocks.push({ id, kind: 'callout', callout_type: ctype, title, body: body_ });
    } else {
      unsupported.push({ id, kind, reason: 'not in the prototype whitelist' });
    }
  }

  if (unsupported.length > 0) {
    const error = new Error(
      `unsupported document node(s): ${unsupported
        .map((u) => `${u.id}(${u.kind}${u.reason ? `: ${u.reason}` : ''})`)
        .join(', ')}`,
    );
    error.code = 'E_NODE_UNSUPPORTED';
    error.details = { unsupported, source: path.basename(absPath) };
    throw error;
  }

  return {
    meta: {
      title: fm.title ?? '',
      authors: fm.authors ?? [],
      abstract: fm.abstract ?? '',
      lang: fm.lang ?? 'zh',
      date: fm.date ?? '',
      extra: Object.fromEntries(unknownKeys.map((k) => [k, fm[k]])),
      source: path.basename(absPath),
    },
    blocks,
    diagnostics,
    relSource: path.basename(absPath),
  };
}
