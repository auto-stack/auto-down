// PLAN-084 — publication-ir-v2 校验 + 样式/呈现感知的 Typst 发射 + 能力诊断 + inspect_style
//
// 薄适配器原则不变：模板/样式/呈现逻辑全部在 Auto（templates/*.at）执行；宿主只做
// IR 校验、Typst 序列化、来源映射与能力核对。逐块发射采用 presentation × computed：
//   * 文本/段落属性按每个 occurrence 的计算值局部应用（#text/#par/#v 包裹）；
//   * 文档级属性（heading_numbering/chapter_pagebreak/title_size/abstract_style）取
//     文档作用域计算值（computed 首个 occurrence 的 doc 块）；
//   * 后端能力表显式列支持属性；不支持的属性（doc.hanging_punctuation）产生
//     W_STYLE_UNSUPPORTED 诊断并保留在 IR/inspect 中——不静默丢弃。
// v2（PLAN-084）：
//   * occurrence 键：content[].occ 唯一（同一语义 id 可复用，AC-04）；computed/
//     presentation 按 occ 对齐；heading/figure/equation 置 Typst label（occ 归一）；
//   * 行内段：ref → #ref(<label>)（display 作 supplement）、cite → 上标 [n] 链接、
//     footnote → #footnote[定义]、math → $...$（dialect=typst 且无 `#`/`$`，否则
//     E_EQUATION_DIALECT / E_EQUATION_SYNTAX 具名拒绝——TeX 未转换项必须报错）；
//   * figure/equation 映射 Typst 内置计数器（numbering 按内容顺序 = 出版树顺序）；
//   * footnotes/bibliography：footnote_def 不入正文流；bib_entry 在文末汇总为
//     编号文献节（label = bib 键；编号 = 声明顺序）；
//   * page.h1_span_columns=1（news）：一级标题跨栏（栏容器开合）；
//   * paper "16:9"（lecture）：297mm×167.0625mm（16:9 显式页面尺寸）；
//   * callout(slide)：分镜框——#pagebreak 分页 + 标题（无编号）+ 项目符号正文。
// 正文文本仍全部经 Typst 字符串字面量输出，不会被当 Typst 代码执行。

const LENGTH_RE = /^(\d+(?:\.\d+)?)(pt|mm|cm|in|em)$/;
const PAPER = new Map([
  ['a4', null],
  ['a5', null],
  ['iso-b5', null],
  ['us-letter', null],
  ['16:9', { width: '297mm', height: '167.0625mm' }],
]);
const TEMPLATES = new Set(['academic', 'office_book', 'press_book', 'news', 'lecture']);
const VIEWS = new Set(['article', 'book', 'newspaper', 'slides']);
const KINDS = new Set([
  'heading', 'paragraph', 'list', 'table', 'callout', 'thematic_break',
  'figure', 'equation', 'footnote_def', 'bib_entry',
]);
const SEG_KINDS = new Set(['text', 'ref', 'cite', 'footnote', 'math']);
const DIALECTS = new Set(['typst']);
const ABSTRACT_STYLES = new Set(['boxed', 'plain']);
const ORIGINS = new Set(['source', 'template', 'render', 'template-reuse']);
const SCHEMA = 'publication-ir-v2';
const RULE_ORIGINS = new Set(['builtin', 'theme', 'template', 'document']);
const SEL_KINDS = new Set(['all', 'type', 'attr', 'id', 'role', 'and', 'or']);
const PROPS = new Set([
  'text.size', 'text.weight', 'text.color', 'text.italic', 'text.font',
  'para.justify', 'para.first_line_indent', 'para.leading', 'para.spacing_above', 'para.spacing_below',
  'doc.heading_numbering', 'doc.chapter_pagebreak', 'doc.title_size', 'doc.abstract_style', 'doc.hanging_punctuation',
]);
// 后端能力表：Typst 发射器实际支持的属性（v2）；未列出的注册属性 → W_STYLE_UNSUPPORTED
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

// 公式边界（§3.4：TeX 未转换项必须报错，不能粘贴混用）
function checkMathSource(nodeId, at, dialect, source) {
  if (!DIALECTS.has(dialect)) {
    throw Object.assign(
      new Error(
        `${at} ${nodeId}: math dialect '${dialect}' has no converter; only 'typst' is emitted (TeX/KaTeX sources must be converted or rejected, never pasted)`,
      ),
      { code: 'E_EQUATION_DIALECT', details: { node_id: nodeId, dialect } },
    );
  }
  if (/[$#]/.test(source)) {
    throw Object.assign(
      new Error(
        `${at} ${nodeId}: math source contains '$' or '#' (would break out of Typst math mode); clean the source or convert the dialect`,
      ),
      { code: 'E_EQUATION_SYNTAX', details: { node_id: nodeId } },
    );
  }
}

function validateSegments(path, segs, block) {
  if (!Array.isArray(segs) || segs.length === 0) fail(path, 'paragraph requires non-empty segments');
  segs.forEach((seg, i) => {
    const at = `${path}[${i}]`;
    if (!seg || typeof seg !== 'object') fail(at, 'segment must be an object');
    if (!SEG_KINDS.has(seg.kind)) fail(`${at}.kind`, `unsupported inline segment ${JSON.stringify(seg.kind)}`);
    if (seg.kind === 'text') needString(`${at}.text`, seg.text, { allowEmpty: false });
    if (seg.kind === 'ref') needString(`${at}.target`, seg.target, { allowEmpty: false });
    if (seg.kind === 'cite') needString(`${at}.key`, seg.key, { allowEmpty: false });
    if (seg.kind === 'footnote') needString(`${at}.label`, seg.label, { allowEmpty: false });
    if (seg.kind === 'math') {
      needString(`${at}.dialect`, seg.dialect, { allowEmpty: false });
      needString(`${at}.source`, seg.source, { allowEmpty: false });
      checkMathSource(block.id, 'inline math', seg.dialect, seg.source);
    }
  });
}

export function validatePublication(pub) {
  if (!pub || typeof pub !== 'object') fail('$', 'publication must be an object');
  if (pub.schema_version !== SCHEMA) {
    fail('$.schema_version', `expected ${SCHEMA}, got ${JSON.stringify(pub.schema_version)}`);
  }
  if (!TEMPLATES.has(pub.template)) fail('$.template', `unknown template ${JSON.stringify(pub.template)}`);
  if (!VIEWS.has(pub.view)) fail('$.view', `unknown view ${JSON.stringify(pub.view)}`);

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
  if (typeof page.h1_span_columns !== 'boolean') fail('$.page.h1_span_columns', 'expected boolean');

  // ---- styles ----
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

  // ---- computed（按 occurrence 对齐）----
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
  needString('$.bib_title', pub.bib_title);

  // ---- content / presentation（occurrence 唯一；语义 id 可复用）----
  if (!Array.isArray(pub.content) || pub.content.length === 0) {
    fail('$.content', 'publication has no content blocks');
  }
  const occs = new Set();
  pub.content.forEach((block, i) => {
    const at = `$.content[${i}]`;
    if (!block || typeof block !== 'object') fail(at, 'block must be an object');
    needString(`${at}.id`, block.id, { allowEmpty: false });
    needString(`${at}.occ`, block.occ, { allowEmpty: false });
    if (occs.has(block.occ)) fail(`${at}.occ`, `duplicate occurrence ${block.occ}`);
    occs.add(block.occ);
    if (!KINDS.has(block.kind)) fail(`${at}.kind`, `unsupported block kind ${JSON.stringify(block.kind)}`);
    if (!ORIGINS.has(block.origin)) {
      fail(`${at}.origin`, `expected source|template|render|template-reuse, got ${JSON.stringify(block.origin)}`);
    }
    if (block.kind === 'heading') {
      needInt(`${at}.level`, block.level, 1, 6);
      needString(`${at}.text`, block.text, { allowEmpty: false });
    } else if (block.kind === 'paragraph') {
      validateSegments(`${at}.segments`, block.segments, block);
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
    } else if (block.kind === 'figure') {
      needString(`${at}.src`, block.src, { allowEmpty: false });
      needString(`${at}.caption`, block.caption);
    } else if (block.kind === 'equation') {
      needString(`${at}.dialect`, block.dialect, { allowEmpty: false });
      needString(`${at}.source`, block.source, { allowEmpty: false });
      checkMathSource(block.id, 'equation', block.dialect, block.source);
    } else if (block.kind === 'footnote_def') {
      needString(`${at}.label`, block.label, { allowEmpty: false });
      needString(`${at}.text`, block.text, { allowEmpty: false });
    } else if (block.kind === 'bib_entry') {
      needString(`${at}.key`, block.key, { allowEmpty: false });
      needString(`${at}.text`, block.text, { allowEmpty: false });
    }
  });
  if (pub.computed.length !== pub.content.length) {
    fail('$.computed', `computed occurrences (${pub.computed.length}) must match content blocks (${pub.content.length})`);
  }
  pub.computed.forEach((c, i) => {
    if (c.id !== pub.content[i].occ) {
      fail(`$.computed[${i}].id`, `must match content occurrence order (${pub.content[i].occ})`);
    }
  });
  if (!Array.isArray(pub.presentation) || pub.presentation.length !== pub.content.length) {
    fail('$.presentation', `presentation entries (${pub.presentation?.length}) must match content blocks (${pub.content.length})`);
  }
  pub.presentation.forEach((entry, i) => {
    const at = `$.presentation[${i}]`;
    needString(`${at}.occurrence_id`, entry.occurrence_id, { allowEmpty: false });
    if (!occs.has(entry.occurrence_id)) fail(`${at}.occurrence_id`, `${entry.occurrence_id} is not a content occurrence`);
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
      } else if (block.kind === 'callout') {
        needString(`${bat}.title`, block.title);
        if (!Array.isArray(block.body) || block.body.length === 0) fail(`${bat}.body`, 'expected non-empty array');
      } else if (block.kind === 'figure') {
        needString(`${bat}.src`, block.src, { allowEmpty: false });
      }
    });
  });
  if (!Array.isArray(pub.render_diags)) fail('$.render_diags', 'expected array');
  pub.render_diags.forEach((d, i) => {
    needString(`$.render_diags[${i}].code`, d.code, { allowEmpty: false });
    needString(`$.render_diags[${i}].rule`, d.rule);
    needString(`$.render_diags[${i}].node`, d.node);
  });
  if (!Array.isArray(pub.references)) fail('$.references', 'expected array');
  pub.references.forEach((r, i) => {
    needString(`$.references[${i}].from`, r.from, { allowEmpty: false });
    needInt(`$.references[${i}].seg`, r.seg, 0, 999);
    needString(`$.references[${i}].kind`, r.kind, { allowEmpty: false });
    needString(`$.references[${i}].target`, r.target, { allowEmpty: false });
    needString(`$.references[${i}].target_occ`, r.target_occ, { allowEmpty: false });
  });
  return pub;
}

// ---------------------------------------------------------------------------
// 能力核对 + inspect_style 数据接口（style-inspect-v1）
// ---------------------------------------------------------------------------

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
            detail: `property '${prop}' is registered but not supported by the Typst backend (v2); kept in IR/inspect, not applied`,
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
    const entry = pub.presentation.find((e) => e.occurrence_id === c.id);
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
    view: pub.view,
    source: pub.document.source,
    capabilities: [...PROPS].map((prop) => ({ prop, supported: BACKEND_SUPPORTED.has(prop) })),
    occurrences,
    render_diags: pub.render_diags,
    references: pub.references,
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

// occurrence → Typst label（`#` 等非标识字符归一为 `-`；前缀按种类区分命名空间）
function labelOf(kind, occ) {
  const prefix = kind === 'heading' ? 'h' : kind === 'figure' ? 'f' : kind === 'equation' ? 'eq' : 'x';
  return `${prefix}-${String(occ).replace(/[^A-Za-z0-9_.-]/g, '-')}`;
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
 * @param {object} pub validated publication-ir-v2
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
  const computedByOcc = new Map(pub.computed.map((c) => [c.id, c]));
  const kindByOcc = new Map(pub.content.map((b) => [b.occ, b.kind]));

  // 引用解析映射：`${from}|${seg}` → target_occ（Auto 侧 validate_refs 的结果）
  const refMap = new Map();
  for (const r of pub.references ?? []) {
    refMap.set(`${r.from}|${r.seg}`, r.target_occ);
  }

  // 索引：脚注定义（label → text）、文献条目（key → 编号）
  const footnoteDefs = new Map();
  const bibEntries = [];
  const bibOrder = new Map();
  for (const block of pub.content) {
    if (block.kind === 'footnote_def') {
      footnoteDefs.set(block.label, { text: block.text, occ: block.occ });
    } else if (block.kind === 'bib_entry' && !bibOrder.has(block.key)) {
      bibOrder.set(block.key, bibEntries.length + 1);
      bibEntries.push(block);
    }
  }
  const hasEquations = pub.content.some((b) => b.kind === 'equation');
  const hasFigures = pub.content.some((b) => b.kind === 'figure');

  push('// generated by autodown/prototypes/publishing — PLAN-084 prototype, do not edit');
  push(`// template: ${pub.template} / view: ${pub.view} / schema: ${pub.schema_version} / source: ${pub.document.source}`);
  push(
    `#set document(title: ${typstString(pub.document.title)}, author: ${typstTuple(
      pub.document.authors.length > 0 ? pub.document.authors : [''],
    )})`,
  );

  const paperSize = PAPER.get(page.paper);
  const marginTuple = `(top: ${page.margin.top}, bottom: ${page.margin.bottom}, left: ${page.margin.left}, right: ${page.margin.right})`;
  if (paperSize) {
    push(
      `#set page(width: ${paperSize.width}, height: ${paperSize.height}, margin: ${marginTuple}, numbering: ${page.page_numbers ? '"1 / 1"' : 'none'})`,
    );
  } else {
    push(`#set page(paper: ${typstString(page.paper)}, margin: ${marginTuple}, numbering: ${page.page_numbers ? '"1 / 1"' : 'none'})`);
  }
  push(`#set text(font: ${typstTuple(page.font_family)}, lang: ${typstString(pub.document.lang)})`);
  // 报头页眉：文档头部一次设置（流中的 #set page 会触发分页——实测把报纸正文
  // 整体推到第 2 页；报头页用页码条件跳过，避免与大幅题头重复）
  if (page.header_text !== '' && pub.view === 'newspaper') {
    push(`#set page(header: context [#if counter(page).get().first() > 1 [#align(center)[#text(size: 8pt)[${typstText(page.header_text)}]]]])`);
  }
  push('#set smartquote(enabled: false)');
  const numbering = docComputed.heading_numbering ?? '';
  if (numbering !== '') {
    push(`#set heading(numbering: ${typstString(numbering)})`);
  }
  // 报纸视图公式不编号（报纸惯例；编号靠右缘在窄栏内与公式末端叠字）。此时
  // 公式引用退化为文本链接（与无编号标题的处理一致）。
  const eqNumbered = hasEquations && !(page.h1_span_columns === true && page.columns > 1);
  if (eqNumbered) {
    // 块级公式编号（set+show 组合：行内式显式不编号——最小探针 eqtest.typ 验证；
    // 直接 set 会把行内式一并计数——实测 1..6 连号）
    push('#set math.equation(numbering: "(1)")');
    push('#show math.equation.where(block: false): set math.equation(numbering: none)');
  }
  if (hasFigures) {
    push('#set figure(supplement: [图])');
  }

  const config = {
    schema: pub.schema_version,
    template: pub.template,
    view: pub.view,
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
    h1_span_columns: page.h1_span_columns,
    footnotes: footnoteDefs.size,
    bib_entries: bibEntries.length,
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

  // ---- 标题 / 作者 / 摘要区（文档作用域计算样式驱动；slides 视图跳过论文式标题区）----
  if (pub.view !== 'slides') {
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
    // 报纸题头区不整页占位（正文从首页题头下开始）；其余视图保持标题页
    if (pub.view !== 'newspaper') {
      push('#pagebreak()');
      if (page.header_text !== '') {
        push(`#set page(header: [#align(center)[#text(size: 8pt)[${typstText(page.header_text)}]]])`);
      }
    } else {
      push('#v(1.2em)');
    }
  }

  // ---- 正文：presentation × computed 逐 occurrence 发射 ----
  const columns = page.columns;
  const h1Span = page.h1_span_columns === true && columns > 1;
  const contentByOcc = new Map(pub.content.map((b) => [b.occ, b]));
  const emitCtx = {
    footnoteDefs,
    bibOrder,
    refMap,
    kindByOcc,
    contentByOcc,
    headingNumbered: numbering !== '',
    eqNumbered,
  };
  let inColumns = false;
  let pendingOpen = false;
  const wantColumns = () => {
    if (columns > 1 && !inColumns) pendingOpen = true;
  };
  const openColumns = () => {
    if (columns > 1 && !inColumns) {
      push(`#columns(${columns}, gutter: 1.1em)[`);
      inColumns = true;
      pendingOpen = false;
    }
  };
  const lazyOpen = (line) => {
    if (pendingOpen) openColumns();
    return line;
  };
  const closeColumns = () => {
    if (inColumns) {
      push(']');
      inColumns = false;
    }
  };
  if (columns > 1 && !h1Span) {
    wantColumns();
  }
  const bodyIndent = columns > 1 ? '  ' : '';
  let firstChapterCandidate = true;
  let firstSlide = true;

  // 报纸形态（h1_span_columns）：文章标题跨栏，正文按字符量近似均分到 N 栏
  //（Typst columns() 在自动高度下只填第一栏——最小复现 coltest.typ；真实回流
  // 均衡需要测量能力，属 086。近似分布：条目原子性保持，按累计字符贪心分格）。
  const entryWeight = (entry) => {
    let w = 0;
    for (const b of entry.blocks) {
      if (b.kind === 'paragraph') {
        for (const seg of b.segments ?? []) w += (seg.text ?? seg.display ?? '').length;
      } else if (b.kind === 'list') {
        for (const item of b.items ?? []) w += item.length;
      } else if (b.kind === 'callout') {
        w += ((b.title ?? '') + (b.body ?? []).join('')).length + 80;
      } else if (b.kind === 'figure' || b.kind === 'equation') {
        w += 120;
      } else if (b.kind === 'table') {
        w += 200;
      }
    }
    return Math.max(w, 1);
  };

  if (h1Span) {
    // 分节：一级标题开节；节内条目流入 grid 单元
    const sections = [];
    let current = null;
    for (const entry of pub.presentation) {
      const first = entry.blocks[0];
      const isHeadline = first?.kind === 'heading' && first.level === 1;
      if (isHeadline) {
        current = { headline: entry, body: [] };
        sections.push(current);
      } else if (current) {
        current.body.push(entry);
      } else {
        current = { headline: null, body: [] };
        sections.push(current);
        current.body.push(entry);
      }
    }
    for (const section of sections) {
      if (section.headline) {
        const computedH = computedByOcc.get(section.headline.occurrence_id) ?? { text: {}, para: {}, doc: {} };
        if (!firstChapterCandidate) push('#v(1.2em)');
        firstChapterCandidate = false;
        push(`// node: ${section.headline.occurrence_id} (role: ${section.headline.role})`);
        emitBlocks(push, '', section.headline, computedH, emitCtx);
      }
      const full = [];
      const flowed = [];
      for (const e of section.body) {
        if (e.blocks[0]?.kind === 'table') full.push(e);
        else flowed.push(e);
      }
      for (const e of full) {
        const c = computedByOcc.get(e.occurrence_id) ?? { text: {}, para: {}, doc: {} };
        push(`// node: ${e.occurrence_id} (role: ${e.role})`);
        emitBlocks(push, '', e, c, emitCtx);
      }
      if (flowed.length === 0) continue;
      // 分配单元：段落按行内段拆分（文本跨栏续排是栏排的常规行为；语义段
      // （ref/脚注/公式）保持原子），其余条目整块原子——保证每栏都有内容。
      const units = [];
      for (const e of flowed) {
        const first = e.blocks[0];
        if (first?.kind === 'paragraph') {
          let si = 0;
          for (const seg of first.segments ?? []) {
            const w =
              seg.kind === 'text' ? Math.max(seg.text.length, 1)
              : seg.kind === 'ref' || seg.kind === 'cite' ? Math.max((seg.display ?? '').length + 4, 4)
              : seg.kind === 'math' ? 12
              : 4;
            units.push({ type: 'seg', entry: e, seg, segIndex: si, weight: w });
            si += 1;
          }
        } else {
          units.push({ type: 'entry', entry: e, weight: entryWeight(e) });
        }
      }
      const total = units.reduce((sum, u) => sum + u.weight, 0);
      const target = total / columns;
      const cells = Array.from({ length: columns }, () => []);
      let acc = 0;
      let ci = 0;
      // 句读粘前：以句末标点开头的文本段不另起新格（栏首避头点），
      // 分格点顺延到该段之后。
      const stickyPunct = (u) =>
        u.type === 'seg' && u.seg.kind === 'text' && /^[。．，、；：！？）」』]/.test(u.seg.text ?? '');
      for (const u of units) {
        if (acc >= target && ci < columns - 1 && !stickyPunct(u)) {
          ci += 1;
          acc = 0;
        }
        cells[ci].push(u);
        acc += u.weight;
      }
      // grid 单元以代码模式逗号传参（标记式并列括号组不是多参数；实测逗号成字面文本）
      push(`#grid(columns: ${columns}, gutter: 1.1em, align: top,`);
      for (const cell of cells) {
        push('[');
        // 同一段落的相邻行内段在单元内合并回一个段落（跨单元的段落=栏间断行）
        let parEntry = null;
        let parSegs = null;
        const flushPar = () => {
          if (parEntry && parSegs && parSegs.length > 0) {
            const c = computedByOcc.get(parEntry.occurrence_id) ?? { text: {}, para: {}, doc: {} };
            const block = { ...parEntry.blocks[0], segments: parSegs };
            emitBlocks(push, '', { ...parEntry, blocks: [block] }, c, emitCtx);
          }
          parEntry = null;
          parSegs = null;
        };
        for (const u of cell) {
          if (u.type === 'seg') {
            if (parEntry !== u.entry) flushPar();
            parEntry = u.entry;
            if (!parSegs) parSegs = [];
            parSegs.push(u.seg);
          } else {
            flushPar();
            const c = computedByOcc.get(u.entry.occurrence_id) ?? { text: {}, para: {}, doc: {} };
            emitBlocks(push, '', u.entry, c, emitCtx);
          }
        }
        flushPar();
        push('],');
      }
      push(')');
    }
  } else {
  for (const entry of pub.presentation) {
    const computed = computedByOcc.get(entry.occurrence_id) ?? { text: {}, para: {}, doc: {} };
    const semantic = contentByOcc.get(entry.occurrence_id);
    const firstBlock = entry.blocks[0];
    const isChapter = firstBlock?.kind === 'heading' && firstBlock?.level === 1;
    const isSlideCallout =
      pub.view === 'slides' && semantic?.kind === 'callout' && semantic.callout_type === 'slide';
    // 报纸视图表格跨栏（grid 单元装不下宽表）；公式随文留在栏内不编号
    // （报纸惯例；编号靠右缘在窄栏内与公式末端叠字）；学术视图表格留在栏内——
    // 流动栏在放不下的表格移入下一栏后继续回填，跨栏重启容器反而造成半页空栏。
    const isWideTable = h1Span && firstBlock?.kind === 'table';
    const chapterBreak =
      (computed.doc?.chapter_pagebreak ?? 0) === 1 && isChapter && !firstChapterCandidate;
    if (isChapter) firstChapterCandidate = false;
    const start = lines.length + 1;
    // slides 分镜框：一分镜一页（静态；分步动画不在本批）
    if (isSlideCallout) {
      closeColumns();
      if (!firstSlide) {
        push('#pagebreak()');
      }
      firstSlide = false;
    } else if (chapterBreak && entry.role === 'heading') {
      if (h1Span) closeColumns();
      push('#pagebreak(weak: true)');
    }
    if (pendingOpen) openColumns();
    push(`${bodyIndent}// node: ${entry.occurrence_id} (role: ${entry.role}${entry.rule ? `, render: ${entry.rule}` : ''})`);
    if (isWideTable) {
      closeColumns();
      emitBlocks(push, '', entry, computed, emitCtx);
      wantColumns();
    } else if (h1Span && isChapter && entry.role === 'heading' && !isSlideCallout) {
      // 跨栏标题：栏容器闭合 → 标题 → 重新开栏（正文回到栏内）
      closeColumns();
      emitBlocks(push, '', entry, computed, emitCtx);
      wantColumns();
    } else {
      wantColumns();
      emitBlocks(push, bodyIndent, entry, computed, emitCtx);
    }
    const end = lines.length;
    sourceMap.push({
      node_id: entry.occurrence_id,
      kind: entry.role,
      origin: entry.rule ? 'render' : semantic?.origin ?? 'source',
      typ_start: start,
      typ_end: end,
    });
  }
  }
  closeColumns('');

  // ---- 文献节（bib_entry 汇总；编号 = 声明顺序；label = bib 键）----
  if (bibEntries.length > 0) {
    push('');
    if (pub.bib_title !== '') {
      push(`#heading(level: 1, numbering: none)[${typstText(pub.bib_title)}]`);
    }
    bibEntries.forEach((b, i) => {
      push(`#par(justify: true)[#text(size: 8.5pt)[#text(weight: "bold")[[${i + 1}] ] ${typstText(b.text)}]] <bib-${b.key}>`);
    });
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

// 行内段发射：text 转义；ref → #ref(label[, supplement])；cite → 上标 [n] 链接；
// footnote → #footnote[定义]；math → $...$。fromOcc 用于查引用解析表。
function emitSegments(segments, ctx, fromOcc) {
  let out = '';
  let idx = 0;
  for (const seg of segments ?? []) {
    if (seg.kind === 'text') {
      out += typstText(seg.text);
    } else if (seg.kind === 'ref') {
      const resolved = ctx.refMap.get(`${fromOcc}|${idx}`) ?? seg.target;
      const targetKind = ctx.kindByOcc.get(resolved) ?? 'heading';
      const label = labelOf(targetKind, resolved);
      const target = ctx.contentByOcc.get(resolved);
      const displayText =
        seg.display && seg.display.trim() !== ''
          ? seg.display
          : target?.text ?? target?.caption ?? resolved;
      if ((targetKind === 'heading' && !ctx.headingNumbered) || (targetKind === 'equation' && !ctx.eqNumbered)) {
        // 无编号标题（如 office_book/press_book/news）：编号 ref 不可用，退化为
        // 文本链接（显示 = 作者 display 或目标标题；语义 ID 与 label 保留）
        out += `#link(<${label}>)[${typstText(displayText)}]`;
      } else if (seg.display && seg.display.trim() !== '') {
        out += `#ref(<${label}>, supplement: [${typstText(seg.display)}])`;
      } else {
        out += `#ref(<${label}>)`;
      }
    } else if (seg.kind === 'cite') {
      const n = ctx.bibOrder.get(seg.key);
      if (n !== undefined) {
        out += `#super[#link(<bib-${seg.key}>)[#text("[${n}]")]]`;
      } else {
        out += typstText(`[${seg.key}]`);
      }
    } else if (seg.kind === 'footnote') {
      const def = ctx.footnoteDefs.get(seg.label);
      if (def) {
        out += `#footnote[${typstText(def.text)}]`;
      } else {
        out += typstText(`[^${seg.label}]`);
      }
    } else if (seg.kind === 'math') {
      // 行内公式：定界符内侧不得有空白（Typst 规则——带空白填充的 $ .. $ 是块
      // 数学；在段内会被忽略为非法块但仍步进计数器，正文丢失且编号错位）
      out += `$${seg.source}$`;
    }
    idx += 1;
  }
  return out;
}

function emitBlocks(push, bodyIndent, entry, computed, ctx) {
  const text = computed.text ?? {};
  const para = computed.para ?? {};
  const spacingAbove = para.spacing_above ? `#v(${len(para.spacing_above)})` : '';
  const spacingBelow = para.spacing_below ? `#v(${len(para.spacing_below)})` : '';
  if (spacingAbove) push(`${bodyIndent}${spacingAbove}`);

  for (const block of entry.blocks) {
    if (block.kind === 'heading') {
      const label = labelOf('heading', ctx.semantic?.occ ?? block.id);
      // 渲染规则接管编号的标题（如 chapter-h1 的“第N章”）局部关闭 Typst 编号
      if (entry.rule !== '' && entry.role === 'heading') {
        push(`${bodyIndent}#[#set heading(numbering: none)`);
        push(`${bodyIndent}  ${'='.repeat(block.level)} ${textWrap(text, typstText(block.text))} <${label}>`);
        push(`${bodyIndent}]`);
      } else {
        push(`${bodyIndent}${'='.repeat(block.level)} ${textWrap(text, typstText(block.text))} <${label}>`);
      }
      push('');
    } else if (block.kind === 'paragraph') {
      const fromOcc = ctx.semantic?.occ ?? block.occ ?? block.id;
      const body = block.segments
        ? emitSegments(block.segments, ctx, fromOcc)
        : typstText(block.text ?? '');
      push(`${bodyIndent}${parWrap(para, textWrap(text, body))}`);
      push('');
    } else if (block.kind === 'list') {
      const itemWrap = (item) => parWrap(para, textWrap(text, typstText(item)));
      for (const item of block.items) {
        push(`${bodyIndent}${block.ordered ? '+' : '-'} ${itemWrap(item)}`);
      }
      push('');
    } else if (block.kind === 'table') {
      push(`${bodyIndent}#table(`);
      // 比例列宽（1fr × cols）：数值列宽按内容收缩（报纸带内仅 ~53% 宽）
      const frCols = Array.from({ length: block.cols }, () => '1fr').join(', ');
      push(`${bodyIndent}  columns: (${frCols}),`);
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
    } else if (block.kind === 'callout' && block.callout_type === 'slide') {
      // 分镜框：标题（无编号）+ 项目符号正文（静态一页一分镜）
      const label = labelOf('heading', ctx.semantic?.occ ?? block.id);
      push(`${bodyIndent}#heading(level: 1, numbering: none)[${textWrap(text, typstText(block.title || '未命名分镜'))}] <${label}>`);
      push('');
      for (const bullet of block.body) {
        push(`${bodyIndent}- ${textWrap(text, typstText(bullet))}`);
      }
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
    } else if (block.kind === 'figure') {
      const label = labelOf('figure', ctx.semantic?.occ ?? block.id);
      push(`${bodyIndent}#figure(`);
      push(`${bodyIndent}  placement: auto,`);
      push(`${bodyIndent}  image(${typstString(block.src)}, width: 100%),`);
      push(`${bodyIndent}  caption: [${textWrap(text, typstText(block.caption))}],`);
      push(`${bodyIndent}  numbering: "1",`);
      push(`${bodyIndent}) <${label}>`);
      push('');
    } else if (block.kind === 'equation') {
      const label = labelOf('equation', ctx.semantic?.occ ?? block.id);
      // 块数学：界定符独占行（同行 $..$ 是行内式；无编号且不受 equation 计数）
      push(`${bodyIndent}$
${bodyIndent}  ${block.source}
${bodyIndent}$ <${label}>`);
      push('');
    } else if (block.kind === 'footnote_def' || block.kind === 'bib_entry') {
      // 定义类节点不入正文流（脚注在标记处展开；文献在文末汇总）
      push(`${bodyIndent}// consumed: ${block.kind} ${block.occ ?? block.id}`);
    } else if (block.kind === 'thematic_break') {
      push(`${bodyIndent}#line(length: 100%, stroke: 0.5pt + rgb("#9aa3ad"))`);
      push('');
    }
  }
  if (spacingBelow) push(`${bodyIndent}${spacingBelow}`);
}
