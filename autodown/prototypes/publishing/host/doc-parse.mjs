// PLAN-082/084 — .ad → 文档模型（复用 @autodown/engine 的现有 parser，不再实现第二套解析）
//
// 输入：一份 .ad 正文（可选 YAML 风格 frontmatter）
// 输出：{ meta, blocks, diagnostics } —— 供 host/wire.mjs 编码成 doc-wire v2 交给 Auto 模板求值
//
// 边界：parser 出口是 engine 的冻结合同（ARCHITECTURE.md §2），这里只消费 dist/parser.js，
// 不修改 parser/serializer。frontmatter 由适配层剥离为文档元数据（Design 10 §4.2），
// 未知键保留在 meta.extra 并给出诊断，不静默丢弃。
//
// PLAN-084（doc-wire v2）新增的适配层约定（均在 parser 合同之上，不改 parser）：
//   * 链接 span（mark=Link）：href 以 `#` 开头 = 节点引用（ref，目标为块 id）；
//     以 `@` 开头 = 文献引用（cite，目标为文献键）。其余 href 压平为“文字（URL）”+ 诊断。
//   * 行内数学 span（attrs.math_inline）：dialect 恒为 typst（engine 的 `$..$` 槽）。
//   * 图片 span（mark=Image）：所在段落若只含图片与纯文本 → figure 块（src=首图，
//     caption=其余文本或 alt）；段落同时含 ref/cite/脚注/行内公式 → E_FIGURE_MIXED_INLINE。
//   * 纯文本段落 `[^label]: 定义文字` → 脚注定义（footnote_def）；正文中的 `[^label]`
//     → 脚注标记（inline footnote）。label 限 [A-Za-z0-9_-]+。
//   * `$callout(type: "bibliography")` 的正文行 `key: 文献条目` → bib_entry 块；
//     行首非 `key:` 形态 → E_BIB_ENTRY（具名可定位）。
//   * 容器（列表项/提示正文/表格单元）内的链接/公式/图片标记压平为文本并计
//     W_INLINE_IN_CONTAINER_FLATTENED（可见诊断，不静默）。

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

const MARK_LINK = 3;
const MARK_IMAGE = 4;
const FOOTNOTE_DEF_RE = /^\[\^([A-Za-z0-9_-]+)\]:\s*(.*)$/;
const FOOTNOTE_MARK_RE = /\[\^([A-Za-z0-9_-]+)\]/g;
const BIB_KEY_RE = /^([A-Za-z0-9_-]+):\s*(.+)$/;

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

function spanAttr(span, key) {
  const attr = (span.attrs ?? []).find((a) => a.key === key);
  if (!attr) return undefined;
  const value = attr.value;
  if (!value || typeof value !== 'object') return undefined;
  return value.value;
}

function inlineText(node) {
  return (node.inlines ?? []).map((span) => span.text ?? '').join('');
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

// 容器内联标记压平统计（列表项/提示正文/表格单元）
function countContainerMarks(spans) {
  let marks = 0;
  for (const span of spans ?? []) {
    const hasStructured =
      (span.marks ?? []).length > 0 || spanAttr(span, 'math_inline') !== undefined;
    if (hasStructured) marks += 1;
  }
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

// Callout 正文：段落与列表项按出现顺序展平（slide 分镜的 `- ` 项目符号进入正文行）
function calloutBodyLines(node) {
  const out = [];
  for (const child of node.children ?? []) {
    if (child.kind === 1) {
      const text = normalizeText(inlineText(child));
      if (text !== '') out.push(text);
    } else if (child.kind === 4) {
      for (const item of child.children ?? []) {
        const text = paragraphTexts(item).join(' ');
        if (text !== '') out.push(text);
      }
    }
  }
  return out;
}

// 段落 → v2 行内段序列。返回 { segments, plainMarks }：
//   segments: [{kind: text|ref|cite|footnote|math, ...}]（结构化语义 + 文本）
//   plainMarks: 被压平的普通标记数（加粗/斜体/行内代码等，非链接/图片）
function paragraphSegments(node, diagnostics, nodeId) {
  const segments = [];
  let plainMarks = 0;
  const pushText = (text) => {
    if (text === '') return;
    const last = segments[segments.length - 1];
    if (last && last.kind === 'text') last.text += text;
    else segments.push({ kind: 'text', text });
  };
  for (const span of node.inlines ?? []) {
    const math = spanAttr(span, 'math_inline');
    if (math !== undefined) {
      segments.push({ kind: 'math', dialect: 'typst', source: String(math) });
      continue;
    }
    const marks = span.marks ?? [];
    if (marks.includes(MARK_LINK)) {
      const href = String(spanAttr(span, 'href') ?? '');
      if (href.startsWith('#')) {
        // 目标可带显式出现序：（消歧第二次及以后的复用出现）
        const rawTarget = href.slice(1);
        const hashAt = rawTarget.indexOf('#');
        const target = hashAt < 0 ? rawTarget : rawTarget.slice(0, hashAt);
        const targetOcc = hashAt < 0 ? '' : rawTarget.slice(hashAt + 1);
        segments.push({ kind: 'ref', target, target_occ: targetOcc, display: span.text ?? '' });
      } else if (href.startsWith('@')) {
        segments.push({ kind: 'cite', key: href.slice(1), display: span.text ?? '' });
      } else {
        // 外部链接：保留文字与目标于诊断，正文压平为“文字（URL）”
        diagnostics.push({
          code: 'W_LINK_EXTERNAL_FLATTENED',
          node_id: nodeId,
          detail: `external link flattened: ${span.text} -> ${href}`,
        });
        pushText(`${span.text ?? ''}（${href}）`);
      }
      continue;
    }
    if (marks.includes(MARK_IMAGE)) {
      segments.push({ kind: 'image', src: String(spanAttr(span, 'src') ?? ''), alt: span.text ?? '' });
      continue;
    }
    if (marks.length > 0) plainMarks += 1;
    pushText(span.text ?? '');
  }
  // 文本段内扫描脚注标记 `[^label]`
  const out = [];
  for (const seg of segments) {
    if (seg.kind !== 'text') {
      out.push(seg);
      continue;
    }
    let lastIndex = 0;
    FOOTNOTE_MARK_RE.lastIndex = 0;
    let match;
    while ((match = FOOTNOTE_MARK_RE.exec(seg.text)) !== null) {
      const before = seg.text.slice(lastIndex, match.index);
      if (before) out.push({ kind: 'text', text: before });
      out.push({ kind: 'footnote', label: match[1] });
      lastIndex = match.index + match[0].length;
    }
    const rest = seg.text.slice(lastIndex);
    if (rest) out.push({ kind: 'text', text: rest });
  }
  return { segments: out, plainMarks };
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
    if (kind === 'Heading') {
      const level = Number(attrValue(node, 'level', 1)) || 1;
      const headingText = normalizeText(inlineText(node));
      if (headingText === '') {
        unsupported.push({ id, kind, reason: 'empty heading' });
        continue;
      }
      blocks.push({ id, kind: 'heading', level: Math.min(Math.max(level, 1), 6), text: headingText });
    } else if (kind === 'Paragraph') {
      const defMatch = inlineText(node).match(FOOTNOTE_DEF_RE);
      if (defMatch) {
        blocks.push({ id, kind: 'footnote_def', label: defMatch[1], text: defMatch[2] });
        continue;
      }
      const { segments, plainMarks } = paragraphSegments(node, diagnostics, id);
      if (plainMarks > 0) {
        diagnostics.push({
          code: 'W_INLINE_MARKS_FLATTENED',
          node_id: id,
          count: plainMarks,
          detail: 'plain marks (bold/italic/code) flattened to text; structured inline (ref/cite/footnote/math) preserved',
        });
      }
      const hasImage = segments.some((s) => s.kind === 'image');
      if (hasImage) {
        const structured = segments.filter((s) => ['ref', 'cite', 'footnote', 'math'].includes(s.kind));
        if (structured.length > 0) {
          const error = new Error(
            `figure paragraph ${id} mixes images with structured inline content (${structured
              .map((s) => s.kind)
              .join(', ')}); split them into separate paragraphs`,
          );
          error.code = 'E_FIGURE_MIXED_INLINE';
          error.details = { node_id: id };
          throw error;
        }
        const images = segments.filter((s) => s.kind === 'image');
        if (images.length > 1) {
          diagnostics.push({
            code: 'W_FIGURE_EXTRA_IMAGES',
            node_id: id,
            count: images.length - 1,
            detail: 'only the first image of the paragraph is used as the figure source',
          });
        }
        const captionFromText = segments
          .filter((s) => s.kind === 'text')
          .map((s) => s.text)
          .join('')
          .trim();
        const caption = captionFromText !== '' ? captionFromText : images[0].alt;
        blocks.push({ id, kind: 'figure', src: images[0].src, caption });
        continue;
      }
      const hasContent = segments.some((s) => s.kind !== 'text' || s.text.trim() !== '');
      if (!hasContent) continue;
      blocks.push({ id, kind: 'paragraph', segments });
    } else if (kind === 'MathBlock') {
      const source = (node.inlines ?? []).map((s) => s.text ?? '').join('');
      blocks.push({ id, kind: 'equation', dialect: 'typst', source: source.trim() });
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
        const marks = (item.children ?? []).reduce((sum, c) => sum + countContainerMarks(c.inlines), 0);
        if (marks > 0) {
          diagnostics.push({
            code: 'W_INLINE_IN_CONTAINER_FLATTENED',
            node_id: item.id,
            count: marks,
            detail: 'inline marks inside list items are flattened',
          });
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
        const cells = (row.children ?? []).map((cell) => {
          const marks = countContainerMarks(cell.inlines);
          if (marks > 0) {
            diagnostics.push({
              code: 'W_INLINE_IN_CONTAINER_FLATTENED',
              node_id: cell.id,
              count: marks,
              detail: 'inline marks inside table cells are flattened',
            });
          }
          return normalizeText(inlineText(cell));
        });
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
      const body_ = calloutBodyLines(node);
      if (body_.length === 0) {
        unsupported.push({ id, kind, reason: 'callout has no paragraph body' });
        continue;
      }
      if (ctype === 'bibliography') {
        // 文献条目一行一条：按原始换行拆分（normalizeText 已把软换行并入段落）
        const rawLines = [];
        for (const child of node.children ?? []) {
          if (child.kind === 1) {
            for (const raw of inlineText(child).split('\n')) {
              const line = raw.trim();
              if (line !== '') rawLines.push(line);
            }
          }
        }
        for (const line of rawLines) {
          const m = line.match(BIB_KEY_RE);
          if (!m) {
            const error = new Error(
              `bibliography entry is not "key: text" in callout ${id}: ${line.slice(0, 60)}`,
            );
            error.code = 'E_BIB_ENTRY';
            error.details = { node_id: id, line: line.slice(0, 120) };
            throw error;
          }
          blocks.push({ id: `${id}-${m[1]}`, kind: 'bib_entry', key: m[1], text: m[2] });
        }
        continue;
      }
      const marks = (node.children ?? []).reduce((sum, c) => sum + countContainerMarks(c.inlines), 0);
      if (marks > 0) {
        diagnostics.push({
          code: 'W_INLINE_IN_CONTAINER_FLATTENED',
          node_id: id,
          count: marks,
          detail: 'inline marks inside callout body are flattened',
        });
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

  // 锚卡（PLAN-084 适配约定，补充 087 的段尾锚）：整段仅为 `^name` 时，
  // 把 name 赋给紧邻的前一个块（等式等无法承载段尾锚的节点），锚卡自身不入流。
  // 段尾锚（`文字 ^name`）已由 parser 原生处理，不在此重复。
  const ANCHOR_CARD_RE = /^\^([A-Za-z0-9_-]+)$/;
  const anchored = [];
  for (const block of blocks) {
    const isAnchorCard =
      block.kind === 'paragraph' &&
      (block.segments ?? []).length === 1 &&
      block.segments[0].kind === 'text' &&
      ANCHOR_CARD_RE.test(block.segments[0].text.trim());
    if (isAnchorCard && anchored.length > 0) {
      const name = block.segments[0].text.trim().slice(1);
      const prev = anchored[anchored.length - 1];
      if (prev.id.startsWith('block-')) {
        prev.id = name;
        continue;
      }
      const error = new Error(
        `anchor card ^${name} follows block ${prev.id} which already carries a persistent id; give the target block no other anchor`,
      );
      error.code = 'E_ANCHOR_CARD';
      error.details = { node_id: block.id, target: prev.id };
      throw error;
    }
    anchored.push(block);
  }

  return {
    blocks: anchored,
    meta: {
      title: fm.title ?? '',
      authors: fm.authors ?? [],
      abstract: fm.abstract ?? '',
      lang: fm.lang ?? 'zh',
      date: fm.date ?? '',
      extra: Object.fromEntries(unknownKeys.map((k) => [k, fm[k]])),
      source: path.basename(absPath),
    },
    diagnostics,
    relSource: path.basename(absPath),
  };
}
