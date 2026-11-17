// PLAN-083 — --doc-styles JSON → STYLEWIRE 1 行协议编码 + 输入校验
//
// 文档规则与节点显式属性是文档侧数据（非模板代码）：宿主校验 JSON 形态后编码为
// TAB 分隔行协议，由 Auto 侧 style.at:parse_styles_wire 解码并参与逐属性合成。
// 值的语义校验（单位白名单、范围、属性注册表）在 Auto 侧统一执行并可定位报错；
// 这里只做结构性校验（字段齐全、类型正确、selector 形态合法）。

const LENGTH_RE = /^(\d+(?:\.\d+)?)(pt|mm|cm|in|em|%)$/;
const HEX_RE = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const ORIGINS = new Set(['document', 'theme']);
const PROPS = new Set([
  'text.size', 'text.weight', 'text.color', 'text.italic', 'text.font',
  'para.justify', 'para.first_line_indent', 'para.leading', 'para.spacing_above', 'para.spacing_below',
  'doc.heading_numbering', 'doc.chapter_pagebreak', 'doc.title_size', 'doc.abstract_style', 'doc.hanging_punctuation',
]);
const PROP_KIND = {
  'text.size': 'length', 'para.first_line_indent': 'length', 'para.leading': 'length',
  'para.spacing_above': 'length', 'para.spacing_below': 'length', 'doc.title_size': 'length',
  'text.color': 'color', 'text.font': 'font',
  'text.weight': 'int', 'text.italic': 'int', 'para.justify': 'int',
  'doc.chapter_pagebreak': 'int', 'doc.hanging_punctuation': 'int',
  'doc.heading_numbering': 'str', 'doc.abstract_style': 'enum',
};

function fail(message, detail) {
  throw Object.assign(new Error(message), { code: 'E_DOC_STYLES', details: detail ?? null });
}

function need(cond, message, detail) {
  if (!cond) fail(message, detail);
}

function escField(value) {
  return String(value).replace(/[\\\t\n\r]/g, (c) => ({ '\\': '\\\\', '\t': '\\t', '\n': '\\n', '\r': '\\r' })[c]);
}

function selFields(selector, where) {
  need(selector && typeof selector === 'object', `${where}: selector must be an object`);
  const kind = selector.kind;
  const slots = ['', '', '', '', ''];
  if (kind === 'all') {
    // 无槽位
  } else if (kind === 'type') {
    need(typeof selector.type === 'string' && selector.type !== '', `${where}: type selector needs a non-empty type`);
    slots[0] = selector.type;
  } else if (kind === 'attr') {
    need(typeof selector.key === 'string' && typeof selector.value === 'string', `${where}: attr selector needs key+value`);
    need(['kind', 'level', 'callout_type'].includes(selector.key), `${where}: attr key must be kind|level|callout_type`);
    slots[1] = selector.key;
    slots[2] = selector.value;
  } else if (kind === 'id') {
    need(typeof selector.id === 'string' && selector.id !== '', `${where}: id selector needs a non-empty id`);
    slots[3] = selector.id;
  } else if (kind === 'role') {
    need(typeof selector.role === 'string' && selector.role !== '', `${where}: role selector needs a non-empty role`);
    slots[4] = selector.role;
  } else if (kind === 'and' || kind === 'or') {
    need(Array.isArray(selector.parts) && selector.parts.length > 0, `${where}: ${kind} selector needs non-empty parts`);
    return { kind, parts: selector.parts };
  } else {
    fail(`${where}: unknown selector kind ${JSON.stringify(kind)}`);
  }
  return { kind, slots };
}

export function validateDocStyles(input) {
  need(input && typeof input === 'object', 'doc styles must be an object');
  const rules = input.rules ?? [];
  const explicit = input.explicit ?? [];
  need(Array.isArray(rules), 'rules must be an array');
  need(Array.isArray(explicit), 'explicit must be an array');
  rules.forEach((rule, i) => {
    const where = `rules[${i}]`;
    need(typeof rule.name === 'string' && rule.name !== '', `${where}: name required`);
    need(!rule.name.includes('\t') && !rule.name.includes('\n'), `${where}: name must not contain tab/newline`);
    need(ORIGINS.has(rule.origin), `${where}: origin must be document|theme`);
    need(typeof rule.scope === 'string', `${where}: scope must be a string (heading id or empty)`);
    need(Number.isInteger(rule.order) && rule.order >= 0 && rule.order <= 99, `${where}: order must be an integer 0..99`);
    selFields(rule.selector ?? { kind: 'all' }, `${where}.selector`);
    need(rule.props && typeof rule.props === 'object', `${where}: props object required`);
    for (const [prop, value] of Object.entries(rule.props)) {
      need(PROPS.has(prop), `${where}: unknown property ${prop}`);
      const kind = PROP_KIND[prop];
      if (kind === 'length') need(typeof value === 'string' && LENGTH_RE.test(value), `${where}.${prop}: expected length like 13pt / 2em, got ${JSON.stringify(value)}`);
      else if (kind === 'color') need(typeof value === 'string' && HEX_RE.test(value), `${where}.${prop}: expected hex color, got ${JSON.stringify(value)}`);
      else if (kind === 'int') need(value === 0 || value === 1 || [100, 200, 300, 400, 500, 600, 700, 800, 900].includes(value), `${where}.${prop}: expected 0|1 (weight: 100..900), got ${JSON.stringify(value)}`);
      else if (kind === 'font') {
        need(Array.isArray(value) && value.length > 0 && value.every((f) => typeof f === 'string' && f !== '' && !f.includes('|')), `${where}.${prop}: expected non-empty font family list without '|'`);
      } else need(typeof value === 'string' && value !== '' && !value.includes('\t') && !value.includes('\n'), `${where}.${prop}: expected a plain string`);
    }
  });
  explicit.forEach((entry, i) => {
    const where = `explicit[${i}]`;
    need(typeof entry.id === 'string' && entry.id !== '', `${where}: id required`);
    need(entry.props && typeof entry.props === 'object', `${where}: props object required`);
    for (const [prop, value] of Object.entries(entry.props)) {
      need(PROPS.has(prop), `${where}: unknown property ${prop}`);
      const kind = PROP_KIND[prop];
      if (kind === 'length') need(typeof value === 'string' && LENGTH_RE.test(value), `${where}.${prop}: expected length`);
      else if (kind === 'color') need(typeof value === 'string' && HEX_RE.test(value), `${where}.${prop}: expected hex color`);
      else if (kind === 'int') need(value === 0 || value === 1 || [100, 200, 300, 400, 500, 600, 700, 800, 900].includes(value), `${where}.${prop}: expected 0|1`);
      else if (kind === 'font') need(Array.isArray(value) && value.length > 0, `${where}.${prop}: expected font list`);
      else need(typeof value === 'string' && value !== '', `${where}.${prop}: expected a plain string`);
    }
  });
  return { rules, explicit };
}

function propLines(prop, value) {
  const kind = PROP_KIND[prop];
  if (kind === 'length') {
    const m = LENGTH_RE.exec(value);
    return `prop\t${prop}\t${m[1]}\t${m[2]}`;
  }
  if (kind === 'color') return `prop\t${prop}\t${value}`;
  if (kind === 'font') return `prop\t${prop}\t${value.join('|')}`;
  return `prop\t${prop}\t${value}`;
}

export function encodeStylesWire(input) {
  const { rules, explicit } = validateDocStyles(input);
  const lines = ['STYLEWIRE 1'];
  for (const rule of rules) {
    lines.push(`rule\t${escField(rule.name)}\t${rule.origin}\t${escField(rule.scope ?? '')}\t${rule.order ?? 0}`);
    const root = selFields(rule.selector ?? { kind: 'all' }, rule.name);
    if (root.parts) {
      // and/or 根：槽位为空，子项逐行 selpart（Auto 侧限制子项为终端选择器）
      lines.push(`sel\t${root.kind}\t\t\t\t\t`);
      for (const part of root.parts) {
        const kid = selFields(part, `${rule.name}.parts`);
        need(!kid.parts, `${rule.name}: nested and/or parts are not supported (terminal parts only)`);
        lines.push(`selpart\t${kid.kind}\t${kid.slots.join('\t')}`);
      }
    } else {
      lines.push(`sel\t${root.kind}\t${root.slots.join('\t')}`);
    }
    for (const [prop, value] of Object.entries(rule.props ?? {})) lines.push(propLines(prop, value));
  }
  for (const entry of explicit) {
    lines.push(`xstyle\t${escField(entry.id)}`);
    for (const [prop, value] of Object.entries(entry.props ?? {})) lines.push(propLines(prop, value));
  }
  lines.push('end');
  return lines.join('\n') + '\n';
}
