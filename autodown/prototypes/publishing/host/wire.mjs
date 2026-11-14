// PLAN-082 — doc-wire v1 编码（宿主 → Auto）
//
// 一行一线：`<tag>\t<...fields>`，字段内 `\` `\t` `\n` `\r` 转义；其余控制字符归一为空格
// （并给出 W_CONTROL_CHARS 诊断，避免静默改字）。Auto 侧 templates/ir.at:parse_doc 是唯一解码方。
//
// 行结构：
//   DOCWIRE 1
//   meta    <key>    <value>
//   block   heading  <id> <level> <text>
//   block   paragraph<id> <text>
//   block   thematic_break <id>
//   block   list     <id> <ordered 0|1> <count>
//   block   list_item<list-id> <index> <text>
//   block   table    <id> <cols> <row-count>
//   block   table_row<table-id> <row-index> <cell>...
//   block   callout  <id> <type> <title> <paragraph-count>
//   block   callout_paragraph <callout-id> <index> <text>
//   end

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

export function encodeDocWire(doc) {
  const lines = ['DOCWIRE 1'];
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

  for (const block of doc.blocks) {
    if (block.kind === 'heading') {
      lines.push(`block\theading\t${escapeField(block.id)}\t${block.level}\t${escapeField(block.text)}`);
    } else if (block.kind === 'paragraph') {
      lines.push(`block\tparagraph\t${escapeField(block.id)}\t${escapeField(block.text)}`);
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

export function encodeRequest({ template, font_size, columns, paper, margin, header_text }) {
  const lines = [`template=${template}`];
  if (font_size !== undefined) lines.push(`font_size=${font_size}`);
  if (columns !== undefined) lines.push(`columns=${columns}`);
  if (paper !== undefined) lines.push(`paper=${paper}`);
  if (margin !== undefined) lines.push(`margin=${margin}`);
  if (header_text !== undefined) lines.push(`header_text=${header_text}`);
  return lines.join('\n') + '\n';
}
