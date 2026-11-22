// PLAN-082/084 — doc-wire 编码（宿主 → Auto）
//
// 一行一线：`<tag>\t<...fields>`，字段内 `\` `\t` `\n` `\r` 转义；其余控制字符归一为空格
// （并给出 W_CONTROL_CHARS 诊断，避免静默改字）。Auto 侧 templates/ir.at:parse_doc 是唯一解码方。
//
// v2（PLAN-084）行结构（v1 行全部保留；Auto 侧同时接受 DOCWIRE 1 与 2）：
//   DOCWIRE 2
//   meta    <key>    <value>
//   block   heading  <id> <level> <text>
//   block   paragraph<id>                      ← 正文文本在随后的 inline 行
//   inline  text     <pid> <index> <text>
//   inline  ref      <pid> <index> <target> <display>
//   inline  cite     <pid> <index> <bibkey> <display>
//   inline  footnote <pid> <index> <label>
//   inline  math     <pid> <index> <dialect> <source>
//   block   figure   <id> <src> <caption>
//   block   equation <id> <dialect> <source>
//   block   footnote_def <id> <label> <text>
//   block   bib_entry <id> <key> <text>
//   block   thematic_break <id>
//   block   list     <id> <ordered 0|1> <count>
//   block   list_item<list-id> <index> <text>
//   block   table    <id> <cols> <row-count>
//   block   table_row<table-id> <row-index> <cell>...
//   block   callout  <id> <type> <title> <paragraph-count>
//   block   callout_paragraph <callout-id> <index> <text>
//   end

export const DOC_WIRE_VERSION = 2;

export function escapeField(value) {
  let out = '';
  for (const ch of String(value)) {
    const code = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (code < 32 || code === 127) out += ' ';
    else out += ch;
  }
  return out;
}

const INLINE_ORDER = ['text', 'ref', 'cite', 'footnote', 'math'];

export function encodeDocWire(doc, { version = DOC_WIRE_VERSION } = {}) {
  const lines = [`DOCWIRE ${version}`];
  const meta = doc.meta;
  const metaLines = [
    ['title', meta.title ?? ''],
    ['abstract', meta.abstract ?? ''],
    ['lang', meta.lang ?? 'zh'],
    ['source', meta.source ?? ''],
  ];
  for (const [key, value] of metaLines) {
    lines.push(`meta\t${key}\t${escapeField(value)}`);
  }
  for (const author of meta.authors ?? []) {
    lines.push(`meta\tauthor\t${escapeField(author)}`);
  }

  const structuredInline = (block) => {
    if (version < 2 || !Array.isArray(block.segments)) return null;
    const rows = [];
    block.segments.forEach((seg, index) => {
      if (!INLINE_ORDER.includes(seg.kind)) {
        throw Object.assign(new Error(`doc-wire: unsupported inline segment kind ${seg.kind}`), {
          code: 'E_NODE_UNSUPPORTED',
          details: { node_id: block.id, kind: seg.kind },
        });
      }
      if (seg.kind === 'text') {
        rows.push(`inline\ttext\t${escapeField(block.id)}\t${index}\t${escapeField(seg.text)}`);
      } else if (seg.kind === 'ref') {
        rows.push(
          `inline\tref\t${escapeField(block.id)}\t${index}\t${escapeField(seg.target)}\t${escapeField(seg.target_occ ?? '')}\t${escapeField(seg.display)}`,
        );
      } else if (seg.kind === 'cite') {
        rows.push(
          `inline\tcite\t${escapeField(block.id)}\t${index}\t${escapeField(seg.key)}\t${escapeField(seg.display)}`,
        );
      } else if (seg.kind === 'footnote') {
        rows.push(`inline\tfootnote\t${escapeField(block.id)}\t${index}\t${escapeField(seg.label)}`);
      } else if (seg.kind === 'math') {
        rows.push(
          `inline\tmath\t${escapeField(block.id)}\t${index}\t${escapeField(seg.dialect)}\t${escapeField(seg.source)}`,
        );
      }
    });
    return rows;
  };

  for (const block of doc.blocks) {
    if (block.kind === 'heading') {
      lines.push(`block\theading\t${escapeField(block.id)}\t${block.level}\t${escapeField(block.text)}`);
    } else if (block.kind === 'paragraph') {
      const inlineRows = structuredInline(block);
      if (inlineRows === null) {
        // v1：文本在线上（082 样例兼容）
        lines.push(`block\tparagraph\t${escapeField(block.id)}\t${escapeField(block.text)}`);
      } else {
        lines.push(`block\tparagraph\t${escapeField(block.id)}`);
        for (const row of inlineRows) lines.push(row);
      }
    } else if (block.kind === 'figure') {
      if (version < 2) {
        throw Object.assign(new Error(`doc-wire v1 cannot carry figure block ${block.id}`), {
          code: 'E_NODE_UNSUPPORTED',
          details: { node_id: block.id, kind: 'figure' },
        });
      }
      lines.push(
        `block\tfigure\t${escapeField(block.id)}\t${escapeField(block.src)}\t${escapeField(block.caption)}`,
      );
    } else if (block.kind === 'equation') {
      if (version < 2) {
        throw Object.assign(new Error(`doc-wire v1 cannot carry equation block ${block.id}`), {
          code: 'E_NODE_UNSUPPORTED',
          details: { node_id: block.id, kind: 'equation' },
        });
      }
      lines.push(
        `block\tequation\t${escapeField(block.id)}\t${escapeField(block.dialect)}\t${escapeField(block.source)}`,
      );
    } else if (block.kind === 'footnote_def') {
      if (version < 2) {
        throw Object.assign(new Error(`doc-wire v1 cannot carry footnote_def block ${block.id}`), {
          code: 'E_NODE_UNSUPPORTED',
          details: { node_id: block.id, kind: 'footnote_def' },
        });
      }
      lines.push(
        `block\tfootnote_def\t${escapeField(block.id)}\t${escapeField(block.label)}\t${escapeField(block.text)}`,
      );
    } else if (block.kind === 'bib_entry') {
      if (version < 2) {
        throw Object.assign(new Error(`doc-wire v1 cannot carry bib_entry block ${block.id}`), {
          code: 'E_NODE_UNSUPPORTED',
          details: { node_id: block.id, kind: 'bib_entry' },
        });
      }
      lines.push(
        `block\tbib_entry\t${escapeField(block.id)}\t${escapeField(block.key)}\t${escapeField(block.text)}`,
      );
    } else if (block.kind === 'thematic_break') {
      lines.push(`block\tthematic_break\t${escapeField(block.id)}`);
    } else if (block.kind === 'list') {
      lines.push(
        `block\tlist\t${escapeField(block.id)}\t${block.ordered ? 1 : 0}\t${block.items.length}`,
      );
      block.items.forEach((item, index) => {
        lines.push(`block\tlist_item\t${escapeField(block.id)}\t${index}\t${escapeField(item)}`);
      });
    } else if (block.kind === 'table') {
      lines.push(`block\ttable\t${escapeField(block.id)}\t${block.cols}\t${block.rows.length}`);
      block.rows.forEach((row, index) => {
        const cells = row.map(escapeField).join('\t');
        lines.push(`block\ttable_row\t${escapeField(block.id)}\t${index}\t${cells}`);
      });
    } else if (block.kind === 'callout') {
      lines.push(
        `block\tcallout\t${escapeField(block.id)}\t${escapeField(block.callout_type)}\t${escapeField(
          block.title,
        )}\t${block.body.length}`,
      );
      block.body.forEach((text, index) => {
        lines.push(
          `block\tcallout_paragraph\t${escapeField(block.id)}\t${index}\t${escapeField(text)}`,
        );
      });
    } else {
      throw Object.assign(new Error(`doc-wire: unsupported block kind ${block.kind}`), {
        code: 'E_NODE_UNSUPPORTED',
        details: { node_id: block.id, kind: block.kind },
      });
    }
  }
  lines.push('end');
  return lines.join('\n') + '\n';
}

export function encodeRequest({ template, view, font_size, columns, paper, margin, header_text }) {
  const lines = [`template=${template}`];
  if (view !== undefined && view !== null) lines.push(`view=${view}`);
  if (font_size !== undefined) lines.push(`font_size=${font_size}`);
  if (columns !== undefined) lines.push(`columns=${columns}`);
  if (paper !== undefined) lines.push(`paper=${paper}`);
  if (margin !== undefined) lines.push(`margin=${margin}`);
  if (header_text !== undefined) lines.push(`header_text=${header_text}`);
  return lines.join('\n') + '\n';
}
