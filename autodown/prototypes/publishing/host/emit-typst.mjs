// PLAN-082 — publication-ir-v0 → Typst 源 + 块级来源映射
//
// 薄适配器：只做 IR 校验、Typst 序列化与 NodeId → Typst 行范围映射；
// 不重新实现模板逻辑，也不把正文当 Typst 源码拼接。所有正文文本经 Typst 字符串字面量
// `#("…")` 输出，`#` `*` `_` `$` `[` `]` `<` `>` 等不会被当成标记或代码执行。

const LENGTH_RE = /^(\d+(?:\.\d+)?)(pt|mm|cm|in|em)$/;
const PAPER = new Set(['a4', 'a5', 'b5', 'us-letter', 'letter']);
const TEMPLATES = new Set(['academic', 'office_book']);
const KINDS = new Set(['heading', 'paragraph', 'list', 'table', 'callout', 'thematic_break']);
const ABSTRACT_STYLES = new Set(['boxed', 'plain']);
const ORIGINS = new Set(['source', 'template']);
const SCHEMA = 'publication-ir-v0';

function fail(path, message) {
  throw Object.assign(new Error(`publication IR invalid at ${path}: ${message}`), {
    code: 'E_IR_SCHEMA',
    details: { path, message },
  });
}

function needLength(path, value) {
  if (typeof value !== 'string' || !LENGTH_RE.test(value)) {
    fail(path, `expected a length such as 10pt / 2.2cm / 1.2em, got ${JSON.stringify(value)}`);
  }
  return value;
}

function needString(path, value, { allowEmpty = true } = {}) {
  if (typeof value !== 'string') fail(path, `expected string, got ${JSON.stringify(value)}`);
  if (!allowEmpty && value.trim() === '') fail(path, 'must not be empty');
  return value;
}

export function validatePublication(pub) {
  if (!pub || typeof pub !== 'object') fail('$', 'publication must be an object');
  if (pub.schema_version !== SCHEMA) {
    fail('$.schema_version', `expected ${SCHEMA}, got ${JSON.stringify(pub.schema_version)}`);
  }
  if (!TEMPLATES.has(pub.template)) fail('$.template', `unknown template ${JSON.stringify(pub.template)}`);

  const doc = pub.document;
  if (!doc || typeof doc !== 'object') fail('$.document', 'missing document metadata');
  needString('$.document.title', doc.title);
  if (!Array.isArray(doc.authors)) fail('$.document.authors', 'expected array');
  doc.authors.forEach((a, i) => needString(`$.document.authors[${i}]`, a));
  needString('$.document.abstract', doc.abstract);
  needString('$.document.lang', doc.lang, { allowEmpty: false });
  needString('$.document.source', doc.source);

  const page = pub.page;
  if (!page || typeof page !== 'object') fail('$.page', 'missing page config');
  if (!PAPER.has(page.paper)) fail('$.page.paper', `unsupported paper ${JSON.stringify(page.paper)}`);
  for (const side of ['top', 'bottom', 'left', 'right']) {
    needLength(`$.page.margin.${side}`, page.margin?.[side]);
  }
  if (!Number.isInteger(page.columns) || page.columns < 1 || page.columns > 3) {
    fail('$.page.columns', `expected integer 1..3, got ${JSON.stringify(page.columns)}`);
  }
  needLength('$.page.font_size', page.font_size);
  if (!Array.isArray(page.font_family) || page.font_family.length === 0) {
    fail('$.page.font_family', 'expected a non-empty font family list');
  }
  page.font_family.forEach((f, i) => needString(`$.page.font_family[${i}]`, f, { allowEmpty: false }));
  needString('$.page.header_text', page.header_text);
  if (typeof page.page_numbers !== 'boolean') fail('$.page.page_numbers', 'expected boolean');

  const style = pub.style;
  if (!style || typeof style !== 'object') fail('$.style', 'missing style config');
  needString('$.style.heading_numbering', style.heading_numbering);
  needLength('$.style.first_line_indent', style.first_line_indent);
  if (typeof style.chapter_pagebreak !== 'boolean') fail('$.style.chapter_pagebreak', 'expected boolean');
  if (typeof style.justify !== 'boolean') fail('$.style.justify', 'expected boolean');
  needLength('$.style.title_size', style.title_size);
  if (!ABSTRACT_STYLES.has(style.abstract_style)) {
    fail('$.style.abstract_style', `expected one of ${[...ABSTRACT_STYLES].join(', ')}`);
  }

  const outline = pub.outline;
  if (!outline || typeof outline !== 'object') fail('$.outline', 'missing outline config');
  if (!Number.isInteger(outline.depth) || outline.depth < 0 || outline.depth > 3) {
    fail('$.outline.depth', 'expected integer 0..3');
  }
  needString('$.outline.title', outline.title);
  if (!Array.isArray(outline.entries)) fail('$.outline.entries', 'expected array');
  outline.entries.forEach((e, i) => {
    needString(`$.outline.entries[${i}].id`, e.id, { allowEmpty: false });
    if (!Number.isInteger(e.level) || e.level < 1 || e.level > 6) {
      fail(`$.outline.entries[${i}].level`, 'expected integer 1..6');
    }
    needString(`$.outline.entries[${i}].title`, e.title);
  });

  if (!Array.isArray(pub.content) || pub.content.length === 0) {
    fail('$.content', 'publication has no content blocks');
  }
  pub.content.forEach((block, i) => {
    const at = `$.content[${i}]`;
    if (!block || typeof block !== 'object') fail(at, 'block must be an object');
    needString(`${at}.id`, block.id, { allowEmpty: false });
    if (!KINDS.has(block.kind)) fail(`${at}.kind`, `unsupported block kind ${JSON.stringify(block.kind)}`);
    if (!ORIGINS.has(block.origin)) fail(`${at}.origin`, 'expected source|template');
    if (block.kind === 'heading') {
      if (!Number.isInteger(block.level) || block.level < 1 || block.level > 6) {
        fail(`${at}.level`, 'expected integer 1..6');
      }
      needString(`${at}.text`, block.text, { allowEmpty: false });
    } else if (block.kind === 'paragraph') {
      needString(`${at}.text`, block.text, { allowEmpty: false });
    } else if (block.kind === 'list') {
      if (![true, false].includes(block.ordered)) fail(`${at}.ordered`, 'expected boolean');
      if (!Array.isArray(block.items) || block.items.length === 0) fail(`${at}.items`, 'expected non-empty array');
      block.items.forEach((item, j) => needString(`${at}.items[${j}]`, item, { allowEmpty: false }));
    } else if (block.kind === 'table') {
      if (!Number.isInteger(block.cols) || block.cols < 1 || block.cols > 8) {
        fail(`${at}.cols`, 'expected integer 1..8');
      }
      if (!Array.isArray(block.rows) || block.rows.length === 0) fail(`${at}.rows`, 'expected non-empty array');
      block.rows.forEach((row, r) => {
        if (!Array.isArray(row) || row.length !== block.cols) {
          fail(`${at}.rows[${r}]`, `expected ${block.cols} cells`);
        }
        row.forEach((cell, c) => needString(`${at}.rows[${r}][${c}]`, cell));
      });
    } else if (block.kind === 'callout') {
      needString(`${at}.callout_type`, block.callout_type);
      needString(`${at}.title`, block.title);
      if (!Array.isArray(block.body) || block.body.length === 0) fail(`${at}.body`, 'expected non-empty array');
      block.body.forEach((p, j) => needString(`${at}.body[${j}]`, p, { allowEmpty: false }));
    }
  });
  return pub;
}

// ---------------------------------------------------------------------------
// Typst 序列化
// ---------------------------------------------------------------------------

export function typstString(value) {
  return (
    '"' +
    String(value)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') +
    '"'
  );
}

function typstText(value) {
  return `#(${typstString(value)})`;
}

function typstTuple(values) {
  const items = values.map(typstString);
  return `(${items.join(', ')}${items.length === 1 ? ',' : ''})`;
}

function typstBool(value) {
  return value ? 'true' : 'false';
}

/**
 * @param {object} pub validated publication-ir-v0
 * @returns {{typ: string, sourceMap: object, config: object}}
 */
export function emitTypst(pub) {
  validatePublication(pub);
  const lines = [];
  const sourceMap = [];
  const push = (line = '') => {
    lines.push(line);
    return lines.length; // 1-based line number
  };

  const page = pub.page;
  const style = pub.style;

  push('// generated by autodown/prototypes/publishing — PLAN-082 prototype, do not edit');
  push(`// template: ${pub.template} / schema: ${pub.schema_version} / source: ${pub.document.source}`);
  push(
    `#set document(title: ${typstString(pub.document.title)}, author: ${typstTuple(
      pub.document.authors.length > 0 ? pub.document.authors : [''],
    )})`,
  );

  const margin = `(top: ${page.margin.top}, bottom: ${page.margin.bottom}, left: ${page.margin.left}, right: ${page.margin.right})`;
  const pageArgs = [`paper: ${typstString(page.paper)}`, `margin: ${margin}`];
  pageArgs.push(`numbering: ${page.page_numbers ? '"1 / 1"' : 'none'}`);
  push(`#set page(${pageArgs.join(', ')})`);
  push(
    `#set text(font: ${typstTuple(page.font_family)}, size: ${page.font_size}, lang: ${typstString(
      pub.document.lang,
    )})`,
  );
  push(
    `#set par(justify: ${typstBool(style.justify)}, leading: 0.64em, first-line-indent: (amount: ${style.first_line_indent}, all: true))`,
  );
  // 正文引号保持字面含义：Typst 默认把直引号转成弯引号，出版 IR 记录的是源文本。
  push('#set smartquote(enabled: false)');
  if (style.heading_numbering !== '') {
    push(`#set heading(numbering: ${typstString(style.heading_numbering)})`);
  }

  const config = {
    schema: pub.schema_version,
    template: pub.template,
    font_size: page.font_size,
    columns: page.columns,
    paper: page.paper,
    margin: page.margin,
    heading_numbering: style.heading_numbering,
    chapter_pagebreak: style.chapter_pagebreak,
    first_line_indent: style.first_line_indent,
    abstract_style: style.abstract_style,
    font_family: page.font_family,
  };
  push('#metadata((');
  for (const [key, value] of Object.entries(config)) {
    let rendered;
    if (typeof value === 'boolean') rendered = typstBool(value);
    else if (typeof value === 'number') rendered = String(value);
    else if (Array.isArray(value)) rendered = typstTuple(value);
    else if (value && typeof value === 'object') {
      rendered = `(${Object.entries(value)
        .map(([k, v]) => `${k}: ${typstString(String(v))}`)
        .join(', ')})`;
    } else rendered = typstString(String(value));
    push(`  ${key}: ${rendered},`);
  }
  push(')) <plan082-config>');

  // ---- 标题 / 作者 / 摘要区（模板样式驱动） ----
  push('');
  push('#align(center)[');
  push(`  #text(size: ${style.title_size}, weight: "bold")[${typstText(pub.document.title)}]`);
  if (pub.document.authors.length > 0) {
    push('  #v(0.5em)');
    push(`  #text(size: 10.5pt)[${typstText(pub.document.authors.join('  ·  '))}]`);
  }
  push(']');

  if (pub.document.abstract !== '') {
    if (style.abstract_style === 'boxed') {
      push('#v(0.8em)');
      push('#block(width: 100%, inset: (x: 1em, y: 0.7em), radius: 2pt, stroke: 0.4pt + rgb("#9aa3ad"))[');
      push('  #text(size: 9pt, weight: "bold")[摘要]');
      push('  #v(0.3em)');
      push(`  #par(justify: true)[${typstText(pub.document.abstract)}]`);
      push(']');
    } else {
      push('#v(0.8em)');
      push(`#par(justify: true)[#text(style: "italic")[${typstText(pub.document.abstract)}]]`);
      push('#v(0.4em)');
    }
  }

  if (pub.outline.depth > 0 && pub.outline.entries.length > 0) {
    push('#v(0.8em)');
    push(`#outline(title: [${typstText(pub.outline.title)}], depth: ${pub.outline.depth})`);
  }
  push('#pagebreak()');
  if (page.header_text !== '') {
    // 页眉从正文页开始（标题页保持干净）
    push(`#set page(header: [#align(center)[#text(size: 8pt)[${typstText(page.header_text)}]]])`);
  }

  // ---- 正文 ----
  const columns = page.columns;
  if (columns > 1) {
    push(`#columns(${columns}, gutter: 1.1em)[`);
  }
  const bodyIndent = columns > 1 ? '  ' : '';
  let firstHeading = true;
  for (const block of pub.content) {
    const start = lines.length + 1;
    push(`${bodyIndent}// node: ${block.id} (${block.kind}, ${block.origin})`);
    if (block.kind === 'heading') {
      if (style.chapter_pagebreak && block.level === 1 && !firstHeading) {
        push(`${bodyIndent}#pagebreak(weak: true)`);
      }
      firstHeading = false;
      push(`${bodyIndent}${'='.repeat(block.level)} ${typstText(block.text)}`);
      push('');
    } else if (block.kind === 'paragraph') {
      push(`${bodyIndent}${typstText(block.text)}`);
      push('');
    } else if (block.kind === 'list') {
      for (const item of block.items) {
        push(`${bodyIndent}${block.ordered ? '+' : '-'} ${typstText(item)}`);
      }
      push('');
    } else if (block.kind === 'table') {
      push(`${bodyIndent}#table(`);
      push(`${bodyIndent}  columns: ${block.cols},`);
      push(`${bodyIndent}  inset: 5pt,`);
      push(`${bodyIndent}  stroke: 0.4pt + rgb("#9aa3ad"),`);
      push(`${bodyIndent}  align: left,`);
      block.rows.forEach((row, r) => {
        const cells = row
          .map((cell) =>
            r === 0 ? `[#text(weight: "bold")[${typstText(cell)}]]` : `[${typstText(cell)}]`,
          )
          .join(', ');
        push(`${bodyIndent}  ${cells},`);
      });
      push(`${bodyIndent})`);
      push('');
    } else if (block.kind === 'callout') {
      const title = block.title !== '' ? block.title : block.callout_type;
      push(`${bodyIndent}#block(width: 100%, inset: (x: 0.9em, y: 0.6em), radius: 2pt, fill: rgb("#f2f4f7"), stroke: 0.4pt + rgb("#c3c9d1"))[`);
      push(`${bodyIndent}  #text(size: 9pt, weight: "bold")[${typstText(title)}]`);
      for (const paragraph of block.body) {
        push(`${bodyIndent}  #v(0.3em)`);
        push(`${bodyIndent}  ${typstText(paragraph)}`);
      }
      push(`${bodyIndent}]`);
      push('');
    } else if (block.kind === 'thematic_break') {
      push(`${bodyIndent}#line(length: 100%, stroke: 0.5pt + rgb("#9aa3ad"))`);
      push('');
    }
    const end = lines.length;
    sourceMap.push({
      node_id: block.id,
      kind: block.kind,
      origin: block.origin,
      typ_start: start,
      typ_end: end,
    });
  }
  if (columns > 1) {
    push(']');
  }

  const typ = lines.join('\n') + '\n';
  return {
    typ,
    config,
    sourceMap: {
      schema_version: 'source-map-v0',
      source: pub.document.source,
      template: pub.template,
      typ_file: 'publication.typ',
      blocks: sourceMap,
    },
  };
}
