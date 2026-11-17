// PLAN-083 — publication-ir-v1 校验 + 样式/呈现感知的 Typst 发射 + 能力诊断 + inspect_style
//
// 薄适配器原则不变：模板/样式/呈现逻辑全部在 Auto（templates/*.at）执行；宿主只做
// IR 校验、Typst 序列化、来源映射与能力核对。逐块发射采用 presentation × computed：
//   * 文本/段落属性按每个 occurrence 的计算值局部应用（#text/#par/#v 包裹）；
//   * 文档级属性（heading_numbering/chapter_pagebreak/title_size/abstract_style）取
//     文档作用域计算值（computed 首个 occurrence 的 doc 块）；
//   * 后端能力表显式列支持属性；不支持的属性（doc.hanging_punctuation）产生
//     W_STYLE_UNSUPPORTED 诊断并保留在 IR/inspect 中——不静默丢弃。
// 正文文本仍全部经 Typst 字符串字面量输出，不会被当 Typst 代码执行。

const LENGTH_RE = /^(\d+(?:\.\d+)?)(pt|mm|cm|in|em)$/;
const PAPER = new Set(['a4', 'a5', 'iso-b5', 'us-letter']);
const TEMPLATES = new Set(['academic', 'office_book']);
const KINDS = new Set(['heading', 'paragraph', 'list', 'table', 'callout', 'thematic_break']);
const ABSTRACT_STYLES = new Set(['boxed', 'plain']);
const ORIGINS = new Set(['source', 'template', 'render']);
const SCHEMA = 'publication-ir-v1';
const RULE_ORIGINS = new Set(['builtin', 'theme', 'template', 'document']);
const SEL_KINDS = new Set(['all', 'type', 'attr', 'id', 'role', 'and', 'or']);
const PROPS = new Set([
  'text.size', 'text.weight', 'text.color', 'text.italic', 'text.font',
  'para.justify', 'para.first_line_indent', 'para.leading', 'para.spacing_above', 'para.spacing_below',
  'doc.heading_numbering', 'doc.chapter_pagebreak', 'doc.title_size', 'doc.abstract_style', 'doc.hanging_punctuation',
]);
// 后端能力表：Typst 发射器实际支持的属性（v1）；未列出的注册属性 → W_STYLE_UNSUPPORTED
const BACKEND_SUPPORTED = new Set(PROPS);
BACKEND_SUPPORTED.delete('doc.hanging_punctuation');

function fail(path, message) {
  throw Object.assign(new Error(`publication IR invalid at ${path}: ${message}`), {
    code: 'E_IR_SCHEMA',
    details: { path, message },
  });
}

function needString(path, value, { allowEmpty = true } = {}) {
  if (typeof value !== 'string') fail(path, `expected string, got ${JSON.stringify(value)}`);
  if (!allowEmpty && value.trim() === '') fail(path, 'must not be empty');
  return value;
}

function needLength(path, value) {
  if (typeof value !== 'string' || !LENGTH_RE.test(value)) {
    fail(path, `expected a length such as 10pt / 2.2cm / 1.2em, got ${JSON.stringify(value)}`);
  }
  return value;
}

function needInt(path, value, lo, hi) {
  if (!Number.isInteger(value) || value < lo || value > hi) {
    fail(path, `expected integer ${lo}..${hi}, got ${JSON.stringify(value)}`);
  }
  return value;
}

function validateSelector(path, sel) {
  if (!sel || typeof sel !== 'object') fail(path, 'selector must be an object');
  if (!SEL_KINDS.has(sel.kind)) fail(`${path}.kind`, `unknown selector kind ${JSON.stringify(sel.kind)}`);
  if (sel.kind === 'type') needString(`${path}.type_name`, sel.type_name, { allowEmpty: false });
  if (sel.kind === 'attr') {
    needString(`${path}.attr_key`, sel.attr_key, { allowEmpty: false });
    needString(`${path}.attr_value`, sel.attr_value);
  }
  if (sel.kind === 'id') needString(`${path}.id`, sel.id, { allowEmpty: false });
  if (sel.kind === 'role') needString(`${path}.role`, sel.role, { allowEmpty: false });
  if (sel.kind === 'and' || sel.kind === 'or') {
    if (!Array.isArray(sel.parts) || sel.parts.length === 0) fail(`${path}.parts`, 'expected non-empty array');
    sel.parts.forEach((p, i) => validateSelector(`${path}.parts[${i}]`, p));
  }
}

function validateStyleBag(path, bag) {
  if (!bag || typeof bag !== 'object') fail(path, 'expected an object');
  for (const key of ['size', 'first_line_indent', 'leading', 'spacing_above', 'spacing_below', 'title_size']) {
    if (bag[key] !== undefined && bag[key] !== null) {
      needString(`${path}.${key}.value`, String(bag[key].value));
      needString(`${path}.${key}.unit`, bag[key].unit);
    }
  }
  if (bag.color !== undefined && bag.color !== null) {
    needInt(`${path}.color.r`, bag.color.r, 0, 255);
    needInt(`${path}.color.g`, bag.color.g, 0, 255);
    needInt(`${path}.color.b`, bag.color.b, 0, 255);
  }
  if (bag.weight !== undefined && bag.weight !== null) needInt(`${path}.weight`, bag.weight, 100, 900);
  for (const key of ['italic', 'justify', 'chapter_pagebreak', 'hanging_punctuation']) {
    if (bag[key] !== undefined && bag[key] !== null) needInt(`${path}.${key}`, bag[key], 0, 1);
  }
  if (bag.font !== undefined && bag.font !== null) {
    if (!Array.isArray(bag.font) || bag.font.length === 0) fail(`${path}.font`, 'expected non-empty array');
  }
  if (bag.abstract_style !== undefined && bag.abstract_style !== null && !ABSTRACT_STYLES.has(bag.abstract_style)) {
    fail(`${path}.abstract_style`, `expected boxed|plain`);
  }
  for (const key of ['heading_numbering']) {
    if (bag[key] !== undefined && typeof bag[key] !== 'string') fail(`${path}.${key}`, 'expected string');
  }
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
  needInt('$.page.columns', page.columns, 1, 3);
  needLength('$.page.font_size', page.font_size);
  if (!Array.isArray(page.font_family) || page.font_family.length === 0) {
    fail('$.page.font_family', 'expected a non-empty font family list');
  }
  page.font_family.forEach((f, i) => needString(`$.page.font_family[${i}]`, f, { allowEmpty: false }));
  needString('$.page.header_text', page.header_text);
  if (typeof page.page_numbers !== 'boolean') fail('$.page.page_numbers', 'expected boolean');

  // ---- v1: styles ----
  const styles = pub.styles;
  if (!styles || typeof styles !== 'object') fail('$.styles', 'missing styles section');
  if (!Array.isArray(styles.rules)) fail('$.styles.rules', 'expected array');
  styles.rules.forEach((rule, i) => {
    const at = `$.styles.rules[${i}]`;
    needString(`${at}.name`, rule.name, { allowEmpty: false });
    if (!RULE_ORIGINS.has(rule.origin)) fail(`${at}.origin`, `expected builtin|theme|template|document`);
    needString(`${at}.scope`, rule.scope);
    needInt(`${at}.scope_depth`, rule.scope_depth, 0, 6);
    needInt(`${at}.order`, rule.order, 0, 999);
    validateSelector(`${at}.selector`, rule.selector);
    validateStyleBag(`${at}.text`, rule.text);
    validateStyleBag(`${at}.para`, rule.para);
    validateStyleBag(`${at}.doc`, rule.doc);
  });
  if (!Array.isArray(styles.explicit)) fail('$.styles.explicit', 'expected array');
  styles.explicit.forEach((x, i) => {
    const at = `$.styles.explicit[${i}]`;
    needString(`${at}.id`, x.id, { allowEmpty: false });
    validateStyleBag(`${at}.text`, x.text);
    validateStyleBag(`${at}.para`, x.para);
    validateStyleBag(`${at}.doc`, x.doc);
  });
  if (!Array.isArray(styles.match_log)) fail('$.styles.match_log', 'expected array');
  styles.match_log.forEach((m, i) => {
    needString(`$.styles.match_log[${i}].rule`, m.rule, { allowEmpty: false });
    needString(`$.styles.match_log[${i}].node`, m.node, { allowEmpty: false });
    needInt(`$.styles.match_log[${i}].matched`, m.matched, 0, 1);
  });
  if (!Array.isArray(styles.render_rules)) fail('$.styles.render_rules', 'expected array');
  styles.render_rules.forEach((r, i) => {
    const at = `$.styles.render_rules[${i}]`;
    needString(`${at}.name`, r.name, { allowEmpty: false });
    needInt(`${at}.priority`, r.priority, 0, 999);
    validateSelector(`${at}.selector`, r.selector);
  });

  // ---- v1: computed ----
  if (!Array.isArray(pub.computed) || pub.computed.length === 0) fail('$.computed', 'expected non-empty array');
  pub.computed.forEach((c, i) => {
    const at = `$.computed[${i}]`;
    needString(`${at}.id`, c.id, { allowEmpty: false });
    validateStyleBag(`${at}.text`, c.text);
    validateStyleBag(`${at}.para`, c.para);
    validateStyleBag(`${at}.doc`, c.doc);
    if (!Array.isArray(c.sources)) fail(`${at}.sources`, 'expected array');
    c.sources.forEach((s, j) => {
      const sat = `${at}.sources[${j}]`;
      if (!PROPS.has(s.prop)) fail(`${sat}.prop`, `unknown property ${JSON.stringify(s.prop)}`);
      needInt(`${sat}.layer`, s.layer, 0, 4);
      needString(`${sat}.origin`, s.origin, { allowEmpty: false });
      needString(`${sat}.rule`, s.rule, { allowEmpty: false });
    });
  });

  const outline = pub.outline;
  if (!outline || typeof outline !== 'object') fail('$.outline', 'missing outline config');
  needInt('$.outline.depth', outline.depth, 0, 3);
  needString('$.outline.title', outline.title);
  if (!Array.isArray(outline.entries)) fail('$.outline.entries', 'expected array');
  outline.entries.forEach((e, i) => {
    needString(`$.outline.entries[${i}].id`, e.id, { allowEmpty: false });
    needInt(`$.outline.entries[${i}].level`, e.level, 1, 6);
    needString(`$.outline.entries[${i}].title`, e.title);
  });

  // ---- content / presentation ----
  if (!Array.isArray(pub.content) || pub.content.length === 0) {
    fail('$.content', 'publication has no content blocks');
  }
  const contentIds = new Set();
  pub.content.forEach((block, i) => {
    const at = `$.content[${i}]`;
    if (!block || typeof block !== 'object') fail(at, 'block must be an object');
    needString(`${at}.id`, block.id, { allowEmpty: false });
    if (contentIds.has(block.id)) fail(`${at}.id`, `duplicate node id ${block.id}`);
    contentIds.add(block.id);
    if (!KINDS.has(block.kind)) fail(`${at}.kind`, `unsupported block kind ${JSON.stringify(block.kind)}`);
    if (!ORIGINS.has(block.origin)) fail(`${at}.origin`, 'expected source|template|render');
    if (block.kind === 'heading') {
      needInt(`${at}.level`, block.level, 1, 6);
      needString(`${at}.text`, block.text, { allowEmpty: false });
    } else if (block.kind === 'paragraph') {
      needString(`${at}.text`, block.text, { allowEmpty: false });
    } else if (block.kind === 'list') {
      if (![true, false].includes(block.ordered)) fail(`${at}.ordered`, 'expected boolean');
      if (!Array.isArray(block.items) || block.items.length === 0) fail(`${at}.items`, 'expected non-empty array');
      block.items.forEach((item, j) => needString(`${at}.items[${j}]`, item, { allowEmpty: false }));
    } else if (block.kind === 'table') {
      needInt(`${at}.cols`, block.cols, 1, 8);
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
  if (pub.computed.length !== pub.content.length) {
    fail('$.computed', `computed occurrences (${pub.computed.length}) must match content blocks (${pub.content.length})`);
  }
  pub.computed.forEach((c, i) => {
    if (c.id !== pub.content[i].id) fail(`$.computed[${i}].id`, `must match content order (${pub.content[i].id})`);
  });
  if (!Array.isArray(pub.presentation) || pub.presentation.length !== pub.content.length) {
    fail('$.presentation', `presentation entries (${pub.presentation?.length}) must match content blocks (${pub.content.length})`);
  }
  pub.presentation.forEach((entry, i) => {
    const at = `$.presentation[${i}]`;
    needString(`${at}.semantic_id`, entry.semantic_id, { allowEmpty: false });
    if (!contentIds.has(entry.semantic_id)) fail(`${at}.semantic_id`, `${entry.semantic_id} is not a content node`);
    needString(`${at}.role`, entry.role);
    needString(`${at}.rule`, entry.rule);
    needInt(`${at}.guard`, entry.guard, 0, 1);
    if (!Array.isArray(entry.blocks) || entry.blocks.length === 0) fail(`${at}.blocks`, 'expected non-empty array');
    entry.blocks.forEach((block, j) => {
      const bat = `${at}.blocks[${j}]`;
      if (!block || typeof block !== 'object') fail(bat, 'block must be an object');
      if (!KINDS.has(block.kind)) fail(`${bat}.kind`, `unsupported block kind ${JSON.stringify(block.kind)}`);
      if (block.kind === 'heading') {
        needInt(`${bat}.level`, block.level, 1, 6);
        needString(`${bat}.text`, block.text, { allowEmpty: false });
      } else if (block.kind === 'paragraph') {
        needString(`${bat}.text`, block.text, { allowEmpty: false });
      } else if (block.kind === 'callout') {
        needString(`${bat}.title`, block.title);
        if (!Array.isArray(block.body) || block.body.length === 0) fail(`${bat}.body`, 'expected non-empty array');
      }
    });
  });
  if (!Array.isArray(pub.render_diags)) fail('$.render_diags', 'expected array');
  pub.render_diags.forEach((d, i) => {
    needString(`$.render_diags[${i}].code`, d.code, { allowEmpty: false });
    needString(`$.render_diags[${i}].rule`, d.rule);
    needString(`$.render_diags[${i}].node`, d.node);
  });
  return pub;
}

// ---------------------------------------------------------------------------
// 能力核对 + inspect_style 数据接口（style-inspect-v1）
// ---------------------------------------------------------------------------

function renderValue(bag, prop) {
  const [group, name] = prop.split('.');
  if (bag?.[group] === undefined || bag?.[group] === null) return undefined;
  const value = bag[group][name];
  return value === undefined || value === null ? undefined : value;
}

export function backendCapabilityDiagnostics(pub) {
  const diags = [];
  pub.computed.forEach((c) => {
    for (const group of ['text', 'para', 'doc']) {
      const bag = c[group] ?? {};
      for (const name of Object.keys(bag)) {
        const prop = `${group}.${name}`;
        if (!PROPS.has(prop)) continue;
        if (!BACKEND_SUPPORTED.has(prop)) {
          diags.push({
            code: 'W_STYLE_UNSUPPORTED',
            prop,
            occurrence: c.id,
            value: bag[name],
            detail: `property '${prop}' is registered but not supported by the Typst backend (v1); kept in IR/inspect, not applied`,
          });
        }
      }
    }
  });
  return diags;
}

export function buildStyleInspect(pub, backendDiags) {
  const unsupportedByOccurrence = new Map();
  for (const d of backendDiags) {
    if (!unsupportedByOccurrence.has(d.occurrence)) unsupportedByOccurrence.set(d.occurrence, []);
    unsupportedByOccurrence.get(d.occurrence).push(d);
  }
  const occurrences = pub.computed.map((c) => {
    const props = [];
    for (const group of ['text', 'para', 'doc']) {
      const bag = c[group] ?? {};
      for (const [name, value] of Object.entries(bag)) {
        const prop = `${group}.${name}`;
        if (!PROPS.has(prop)) continue;
        props.push({
          prop,
          value,
          backend: BACKEND_SUPPORTED.has(prop) ? 'supported' : 'unsupported',
          // 采用链（升序，最后一条生效）；来自 IR sources
          chain: c.sources.filter((s) => s.prop === prop),
        });
      }
    }
    const entry = pub.presentation.find((e) => e.semantic_id === c.id);
    return {
      id: c.id,
      role: entry?.role ?? '',
      render_rule: entry?.rule ?? '',
      guard: entry?.guard ?? 0,
      props,
      unsupported: (unsupportedByOccurrence.get(c.id) ?? []).map(({ prop, value, detail }) => ({ prop, value, detail })),
    };
  });
  return {
    schema_version: 'style-inspect-v1',
    template: pub.template,
    source: pub.document.source,
    capabilities: [...PROPS].map((prop) => ({ prop, supported: BACKEND_SUPPORTED.has(prop) })),
    occurrences,
    render_diags: pub.render_diags,
  };
}

// ---------------------------------------------------------------------------
// Typst 序列化（presentation × computed 驱动）
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

function len({ value, unit }) {
  return `${value}${unit}`;
}

function colorOf(c) {
  return `rgb("#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')}")`;
}

// 文本属性包裹（size/weight/italic/color/font；未设置的属性不输出）
function textWrap(text, body) {
  if (!text || Object.keys(text).length === 0) return body;
  const args = [];
  if (text.size) args.push(`size: ${len(text.size)}`);
  if (text.weight) args.push(`weight: ${text.weight}`);
  if (text.italic === 1) args.push('style: "italic"');
  if (text.color) args.push(`fill: ${colorOf(text.color)}`);
  if (text.font) args.push(`font: ${typstTuple(text.font)}`);
  if (args.length === 0) return body;
  return `#text(${args.join(', ')})[${body}]`;
}

// 段落属性包裹（justify/缩进/行距）；spacing_above/below 用 #v 表达
function parWrap(para, body) {
  if (!para || Object.keys(para).length === 0) return body;
  const args = [];
  if (para.justify !== undefined) args.push(`justify: ${typstBool(para.justify === 1)}`);
  if (para.first_line_indent) args.push(`first-line-indent: (amount: ${len(para.first_line_indent)}, all: true)`);
  if (para.leading) args.push(`leading: ${len(para.leading)}`);
  if (args.length === 0) return body;
  return `#par(${args.join(', ')})[${body}]`;
}

/**
 * @param {object} pub validated publication-ir-v1
 * @returns {{typ: string, sourceMap: object, config: object, backendDiags: object[]}}
 */
export function emitTypst(pub) {
  validatePublication(pub);
  const backendDiags = backendCapabilityDiagnostics(pub);
  const lines = [];
  const sourceMap = [];
  const push = (line = '') => {
    lines.push(line);
    return lines.length;
  };

  const page = pub.page;
  const docComputed = pub.computed[0]?.doc ?? {};
  const computedById = new Map(pub.computed.map((c) => [c.id, c]));
  const presentationOf = new Map(pub.presentation.map((e) => [e.semantic_id, e]));

  push('// generated by autodown/prototypes/publishing — PLAN-083 prototype, do not edit');
  push(`// template: ${pub.template} / schema: ${pub.schema_version} / source: ${pub.document.source}`);
  push(
    `#set document(title: ${typstString(pub.document.title)}, author: ${typstTuple(
      pub.document.authors.length > 0 ? pub.document.authors : [''],
    )})`,
  );

  const margin = `(top: ${page.margin.top}, bottom: ${page.margin.bottom}, left: ${page.margin.left}, right: ${page.margin.right})`;
  push(`#set page(paper: ${typstString(page.paper)}, margin: ${margin}, numbering: ${page.page_numbers ? '"1 / 1"' : 'none'})`);
  push(`#set text(font: ${typstTuple(page.font_family)}, lang: ${typstString(pub.document.lang)})`);
  push('#set smartquote(enabled: false)');
  const numbering = docComputed.heading_numbering ?? '';
  if (numbering !== '') {
    push(`#set heading(numbering: ${typstString(numbering)})`);
  }

  const config = {
    schema: pub.schema_version,
    template: pub.template,
    font_size: page.font_size,
    columns: page.columns,
    paper: page.paper,
    margin: page.margin,
    heading_numbering: numbering,
    chapter_pagebreak: docComputed.chapter_pagebreak ?? 0,
    title_size: docComputed.title_size ? len(docComputed.title_size) : '',
    abstract_style: docComputed.abstract_style ?? '',
    font_family: page.font_family,
    header_text: page.header_text,
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

  // ---- 标题 / 作者 / 摘要区（文档作用域计算样式驱动） ----
  push('');
  push('#align(center)[');
  const titleSize = docComputed.title_size ? len(docComputed.title_size) : '20pt';
  push(`  #text(size: ${titleSize}, weight: "bold")[${typstText(pub.document.title)}]`);
  if (pub.document.authors.length > 0) {
    push('  #v(0.5em)');
    push(`  #text(size: 10.5pt)[${typstText(pub.document.authors.join('  ·  '))}]`);
  }
  push(']');

  if (pub.document.abstract !== '') {
    if ((docComputed.abstract_style ?? 'plain') === 'boxed') {
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
    push(`#set page(header: [#align(center)[#text(size: 8pt)[${typstText(page.header_text)}]]])`);
  }

  // ---- 正文：presentation × computed 逐 occurrence 发射 ----
  const columns = page.columns;
  if (columns > 1) {
    push(`#columns(${columns}, gutter: 1.1em)[`);
  }
  const bodyIndent = columns > 1 ? '  ' : '';
  let firstChapterCandidate = true;
  for (const entry of pub.presentation) {
    const computed = computedById.get(entry.semantic_id) ?? { text: {}, para: {}, doc: {} };
    const firstBlock = entry.blocks[0];
    const isChapter =
      firstBlock?.kind === 'heading' && firstBlock?.level === 1;
    const chapterBreak =
      (computed.doc?.chapter_pagebreak ?? 0) === 1 && isChapter && !firstChapterCandidate;
    if (isChapter) firstChapterCandidate = false;
    const start = lines.length + 1;
    push(`${bodyIndent}// node: ${entry.semantic_id} (role: ${entry.role}${entry.rule ? `, render: ${entry.rule}` : ''})`);
    if (chapterBreak && entry.role === 'heading') {
      push(`${bodyIndent}#pagebreak(weak: true)`);
    }
    for (const block of entry.blocks) {
      emitBlock(push, bodyIndent, block, computed, entry);
    }
    const end = lines.length;
    sourceMap.push({
      node_id: entry.semantic_id,
      kind: entry.role,
      origin: entry.rule ? 'render' : 'source',
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
    backendDiags,
    sourceMap: {
      schema_version: 'source-map-v0',
      source: pub.document.source,
      template: pub.template,
      typ_file: 'publication.typ',
      blocks: sourceMap,
    },
  };
}

function emitBlock(push, bodyIndent, block, computed, entry) {
  const text = computed.text ?? {};
  const para = computed.para ?? {};
  const spacingAbove = para.spacing_above ? `#v(${len(para.spacing_above)})` : '';
  const spacingBelow = para.spacing_below ? `#v(${len(para.spacing_below)})` : '';
  if (spacingAbove) push(`${bodyIndent}${spacingAbove}`);

  if (block.kind === 'heading') {
    // 渲染规则接管编号的标题（如 chapter-h1 的“第N章”）局部关闭 Typst 编号
    if (entry.rule !== '' && entry.role === 'heading') {
      push(`${bodyIndent}#[#set heading(numbering: none)`);
      push(`${bodyIndent}  ${'='.repeat(block.level)} ${textWrap(text, typstText(block.text))}`);
      push(`${bodyIndent}]`);
    } else {
      push(`${bodyIndent}${'='.repeat(block.level)} ${textWrap(text, typstText(block.text))}`);
    }
    push('');
  } else if (block.kind === 'paragraph') {
    push(`${bodyIndent}${parWrap(para, textWrap(text, typstText(block.text)))}`);
    push('');
  } else if (block.kind === 'list') {
    const itemWrap = (item) => parWrap(para, textWrap(text, typstText(item)));
    for (const item of block.items) {
      push(`${bodyIndent}${block.ordered ? '+' : '-'} ${itemWrap(item)}`);
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
          r === 0
            ? `[#text(weight: "bold")[${textWrap(text, typstText(cell))}]]`
            : `[${textWrap(text, typstText(cell))}]`,
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
      push(`${bodyIndent}  ${parWrap(para, textWrap(text, typstText(paragraph)))}`);
    }
    push(`${bodyIndent}]`);
    push('');
  } else if (block.kind === 'thematic_break') {
    push(`${bodyIndent}#line(length: 100%, stroke: 0.5pt + rgb("#9aa3ad"))`);
    push('');
  }
  if (spacingBelow) push(`${bodyIndent}${spacingBelow}`);
}
