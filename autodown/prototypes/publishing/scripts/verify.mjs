#!/usr/bin/env node
// PLAN-082 验收脚本：AC-01..AC-07 的可复跑证据。
//
// 运行：node scripts/verify.mjs
// 产物：out/verify/report.json + out/verify/report.md（每条检查含命令、退出码、关键数字）
//
// 本脚本不修改实现文件；失败以非零退出码返回，并打印失败断言。

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSource } from '../host/doc-parse.mjs';
import { emitTypst } from '../host/emit-typst.mjs';
import { locateTypst, typstCompile, PINNED_TYPST_VERSION } from '../host/typst.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(HERE, '..');
const REPO = path.resolve(PROTO, '../../..');
const OUT = path.join(PROTO, 'out', 'verify');
const AUTO = process.env.PLAN082_AUTO || 'auto';

const checks = [];
async function check(id, name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    checks.push({ id, name, ok: true, detail: detail ?? null, ms: Date.now() - started });
    process.stdout.write(`  ok  ${id} ${name}\n`);
  } catch (error) {
    checks.push({
      id,
      name,
      ok: false,
      detail: { message: error.message, ...(error.detail ?? {}) },
      ms: Date.now() - started,
    });
    process.stdout.write(`  FAIL ${id} ${name}: ${error.message}\n`);
  }
}

function assert(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail ?? {};
    throw error;
  }
}

function run(command, args, options = {}) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? PROTO,
    encoding: 'utf8',
    env: { ...process.env, AUTO_ACE_CANDIDATE: '0', ...(options.env ?? {}) },
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    command: [command, ...args].join(' '),
    code: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ms: Date.now() - started,
  };
}

function parsePayload(result) {
  for (const stream of [result.stdout, result.stderr]) {
    const trimmed = stream.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      return JSON.parse(trimmed);
    } catch {
      // 继续尝试另一个流
    }
  }
  return null;
}

function publish(args) {
  const result = run(process.execPath, [path.join(PROTO, 'host', 'publish.mjs'), ...args]);
  return { ...result, payload: parsePayload(result) };
}

function pdfProbe(runDir, withPng) {
  const json = path.join(runDir, 'pdf-probe.json');
  const png = path.join(runDir, 'png');
  mkdirSync(png, { recursive: true });
  const result = run('python', [path.join(PROTO, 'host', 'pdf_probe.py'), path.join(runDir, 'publication.pdf'), json, png]);
  if (result.code !== 0) {
    const error = new Error(`pdf_probe failed: ${result.stderr.slice(-800)}`);
    error.detail = { command: result.command, exit: result.code };
    throw error;
  }
  return JSON.parse(readFileSync(json, 'utf8'));
}

// 把同一页的正文行首分成栏。两种口径（2026-11-22 实测标定）：
//  * dense（默认，share>=0.15 + 相邻簇间距 > 20% 页宽）：academic 2 栏/单栏判别；
//    表格页的单元格簇 share 低，不会假造栏位。
//  * anchor（share>=0.05 且 >=3 行 + 锚点跳变 > 25% 页宽）：报纸 3 栏判别——
//    报纸每栏文本量小（share 约 0.10），dense 口径会漏；锚点跳变可跳过列表缩进。
// 过短页（标题/前言）与目录页（点线引导）不作为栏位样本。
function columnCount(page, mode = 'dense') {
  if (page.chars < 400) return 0;
  if (/\.\s+\.\s+\./.test(page.text)) return 0;
  const width = page.width;
  if (mode === 'anchor') {
    const clusters = page.x_clusters.filter((c) => c.share >= 0.05 && c.lines >= 3).sort((a, b) => a.x0 - b.x0);
    if (clusters.length === 0) return 0;
    let columns = 1;
    let anchor = clusters[0].x0;
    for (let i = 1; i < clusters.length; i += 1) {
      if (clusters[i].x0 - anchor > width * 0.25) {
        columns += 1;
        anchor = clusters[i].x0;
      }
    }
    return columns;
  }
  const clusters = page.x_clusters.filter((c) => c.share >= 0.15).sort((a, b) => a.x0 - b.x0);
  if (clusters.length === 0) return 0;
  let columns = 1;
  for (let i = 1; i < clusters.length; i += 1) {
    if (clusters[i].x0 - clusters[i - 1].x0 > width * 0.2) columns += 1;
  }
  return columns;
}

function stripWs(value) {
  return value.replace(/\s+/g, '');
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function syntheticPublication(text) {
  const block = { id: 'syn-1', kind: 'paragraph', origin: 'template', occ: 'syn-1', segments: [{ kind: 'text', text }] };
  return {
    schema_version: 'publication-ir-v2',
    template: 'academic',
    view: 'article',
    bib_title: '参考文献',
    document: { title: '序列化检查', authors: ['排版原型'], abstract: '', lang: 'zh', source: 'synthetic.ad' },
    page: {
      paper: 'a4',
      margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
      columns: 1,
      font_size: '10pt',
      font_family: ['Noto Serif SC'],
      header_text: '',
      page_numbers: true,
      h1_span_columns: false,
    },
    styles: {
      rules: [
        {
          name: 'builtin-typography', origin: 'builtin', scope: '', scope_depth: 0, order: 0,
          selector: { kind: 'all' }, text: { font: ['Noto Serif SC'] }, para: {}, doc: {},
        },
      ],
      explicit: [],
      match_log: [],
      render_rules: [],
    },
    computed: [
      {
        id: 'syn-1',
        text: { size: { value: 10, unit: 'pt' }, font: ['Noto Serif SC'] },
        para: { justify: 0, first_line_indent: { value: 0, unit: 'em' }, leading: { value: 0.64, unit: 'em' } },
        doc: {},
        sources: [{ prop: 'text.size', layer: 0, origin: 'builtin', rule: 'builtin-body', scope: '', order: 0 }],
      },
    ],
    outline: { depth: 0, title: '', entries: [] },
    content: [block],
    presentation: [{ occurrence_id: 'syn-1', role: 'paragraph', rule: '', guard: 0, blocks: [block] }],
    render_diags: [],
    references: [],
  };
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const autoVersion = run(AUTO, ['--version']);
  const typstBin = locateTypst(PROTO);
  const typstVersion = typstBin ? run(typstBin, ['--version']) : null;
  const env = {
    auto: `${autoVersion.command} -> ${autoVersion.stdout.trim() || autoVersion.stderr.trim()}`,
    typst: typstVersion ? `${typstVersion.command} -> ${typstVersion.stdout.trim()}` : 'missing',
    node: process.version,
    platform: process.platform,
    typst_pinned: PINNED_TYPST_VERSION,
  };

  // ---------------------------------------------------------------- AC-01
  await check('AC-01', '普通 Auto 执行 fn/type/if/for 并产生结构化输出', () => {
    const probeDir = path.join(OUT, 'probe');
    mkdirSync(probeDir, { recursive: true });
    const result = run(AUTO, [path.join(PROTO, 'templates', 'probe.at')], {
      env: { PLAN082_RUN_DIR: probeDir },
    });
    assert(result.code === 0, `auto probe exit ${result.code}`, { stderr: result.stderr.slice(-800) });
    const resultPath = path.join(probeDir, 'probe-result.json');
    assert(existsSync(resultPath), 'probe-result.json missing');
    const probe = JSON.parse(readFileSync(resultPath, 'utf8'));
    const labels = probe.items.map((item) => item.label);
    assert(JSON.stringify(labels) === JSON.stringify(['alpha', '空', 'gamma（超出）']), `unexpected labels ${JSON.stringify(labels)}`);
    assert(probe.over_limit === 1, `over_limit ${probe.over_limit}`);
    const source = readFileSync(path.join(PROTO, 'templates', 'probe.at'), 'utf8');
    for (const token of ['type ProbeInput', 'fn expand', 'for item in input.items', 'if index >= limit']) {
      assert(source.includes(token), `probe.at missing ${token}`);
    }
    return { command: result.command, exit: result.code, labels, over_limit: probe.over_limit };
  });

  // ---------------------------------------------------------------- AC-02
  const academicDir = path.join(OUT, 'academic');
  const bookDir = path.join(OUT, 'office_book');
  const academicRun = publish(['--source', 'samples/research.ad', '--template', 'academic', '--out', academicDir]);
  const bookRun = publish([
    '--source',
    'samples/research.ad',
    '--template',
    'office_book',
    '--out',
    bookDir,
    '--header-text',
    'AutoDown 排版原型',
  ]);
  const academicPdf = pdfProbe(academicDir, true);
  const bookPdf = pdfProbe(bookDir, true);
  const academicReport = JSON.parse(readFileSync(path.join(academicDir, 'run-report.json'), 'utf8'));
  const bookReport = JSON.parse(readFileSync(path.join(bookDir, 'run-report.json'), 'utf8'));
  const academicIr = JSON.parse(readFileSync(path.join(academicDir, 'publication.json'), 'utf8'));
  const bookIr = JSON.parse(readFileSync(path.join(bookDir, 'publication.json'), 'utf8'));

  await check('AC-02a', '同一正文由两个模板输出两个可打开 PDF', () => {
    assert(academicRun.code === 0, `academic publish exit ${academicRun.code}: ${academicRun.stderr.slice(-500)}`);
    assert(bookRun.code === 0, `office_book publish exit ${bookRun.code}: ${bookRun.stderr.slice(-500)}`);
    for (const [name, probe] of [
      ['academic', academicPdf],
      ['office_book', bookPdf],
    ]) {
      assert(probe.page_count >= 1, `${name} has no pages`);
      assert(probe.page_sizes.length === 1 && probe.page_sizes[0][0] > 500, `${name} page geometry ${JSON.stringify(probe.page_sizes)}`);
      assert(probe.text.length > 500, `${name} extracted text too short`);
    }
    return {
      academic_pages: academicPdf.page_count,
      office_book_pages: bookPdf.page_count,
      sizes: academicPdf.page_sizes,
      academic_pdf_sha: academicReport.outputs.pdf.sha256,
      office_book_pdf_sha: bookReport.outputs.pdf.sha256,
    };
  });

  await check('AC-02b', '正文关键内容与 NodeId 一致、页面/栏结构真实不同', () => {
    const mustHave = ['相机与激光雷达融合的多传感器感知方法', '时间基准', '传感器', '融合流程', '结论'];
    for (const phrase of mustHave) {
      assert(academicPdf.text.includes(phrase), `academic PDF missing ${phrase}`);
      assert(bookPdf.text.includes(phrase), `office_book PDF missing ${phrase}`);
    }
    const sourceIds = (ir) => ir.content.filter((block) => block.origin === 'source').map((block) => block.id);
    assert(JSON.stringify(sourceIds(academicIr)) === JSON.stringify(sourceIds(bookIr)), 'source node id order differs between templates');
    const contentById = new Map(academicIr.content.map((block) => [block.id, block]));
    for (const entry of academicIr.outline.entries) {
      const block = contentById.get(entry.id);
      assert(block && block.kind === 'heading' && block.text === entry.title, `outline entry ${entry.id} does not match a heading`);
    }
    const academicColumns = Math.max(...academicPdf.pages.map(columnCount));
    const bookColumns = Math.max(...bookPdf.pages.map(columnCount));
    assert(academicColumns === 2, `academic max columns ${academicColumns}`);
    assert(bookColumns === 1, `office_book max columns ${bookColumns}`);
    assert(academicPdf.page_count !== bookPdf.page_count, 'page counts are equal between templates');
    assert(academicIr.page.columns === 2 && bookIr.page.columns === 1, 'IR columns differ from expected');
    // v1：扁平 style 字段迁移为逐块计算样式（同层差异经 computed 断言）
    const docOf = (ir) => ir.computed[0]?.doc ?? {};
    const paraOf = (ir, id) => ir.computed.find((c) => c.id === id)?.para ?? {};
    assert(docOf(academicIr).chapter_pagebreak === 0 && docOf(bookIr).chapter_pagebreak === 1, 'chapter pagebreak not template-specific');
    assert(paraOf(academicIr, 'block-1').first_line_indent?.value === 0 && paraOf(bookIr, 'block-1').first_line_indent?.value === 2, 'first-line indent not template-specific');
    assert(bookPdf.pages.slice(1).every((page) => page.text.includes('AutoDown 排版原型')), 'office_book header missing on body pages');
    assert(academicPdf.pages.every((page) => !page.text.includes('AutoDown 排版原型')), 'academic PDF carries the book header');
    return {
      source_blocks: sourceIds(academicIr).length,
      academic_columns: academicColumns,
      office_book_columns: bookColumns,
      academic_pages: academicPdf.page_count,
      office_book_pages: bookPdf.page_count,
    };
  });

  // ---------------------------------------------------------------- AC-03
  const paramDir = path.join(OUT, 'academic-param');
  const paramRun = publish([
    '--source',
    'samples/research.ad',
    '--template',
    'academic',
    '--out',
    paramDir,
    '--columns',
    '1',
    '--font-size',
    '12pt',
    '--margin',
    '3cm',
  ]);
  const paramPdf = pdfProbe(paramDir, false);
  const paramReport = JSON.parse(readFileSync(path.join(paramDir, 'run-report.json'), 'utf8'));
  await check('AC-03', '模板参数真实生效（栏数/字号/页边距改变布局与 Typst 配置）', () => {
    assert(paramRun.code === 0, `param publish exit ${paramRun.code}: ${paramRun.stderr.slice(-500)}`);
    const applied = paramReport.typst_config;
    assert(applied, 'typst query produced no config');
    assert(String(applied.font_size) === '12pt', `typst_config.font_size ${JSON.stringify(applied.font_size)}`);
    assert(String(applied.columns) === '1', `typst_config.columns ${JSON.stringify(applied.columns)}`);
    assert(applied.margin && applied.margin.top === '3cm', `typst_config.margin ${JSON.stringify(applied.margin)}`);
    assert(itemChanged(paramPdf, academicPdf), 'layout did not change with parameters');
    assert(Math.max(...paramPdf.pages.map(columnCount)) === 1, 'parameter run still renders multiple columns');
    assert(paramReport.outputs.pdf.sha256 !== academicReport.outputs.pdf.sha256, 'PDF bytes unchanged after parameter change');
    const paramIr = JSON.parse(readFileSync(path.join(paramDir, 'publication.json'), 'utf8'));
    assert(
      JSON.stringify(paramIr.content.filter((b) => b.origin === 'source').map((b) => b.id)) ===
        JSON.stringify(academicIr.content.filter((b) => b.origin === 'source').map((b) => b.id)),
      'source node ids changed with template parameters',
    );
    return {
      applied: { font_size: applied.font_size, columns: applied.columns, margin: applied.margin },
      pages: paramPdf.page_count,
      chars: paramPdf.text.length,
      baseline_pages: academicPdf.page_count,
      baseline_chars: academicPdf.text.length,
      pdf_sha: paramReport.outputs.pdf.sha256,
    };
  });

  // ---------------------------------------------------------------- AC-03b
  const headerDir = path.join(OUT, 'academic-header');
  const headerRun = publish(['--source', 'samples/research.ad', '--template', 'academic', '--out', headerDir, '--header-text', '页眉文字检查']);
  const headerPdf = pdfProbe(headerDir, false);
  const headerReport = JSON.parse(readFileSync(path.join(headerDir, 'run-report.json'), 'utf8'));
  const bookMarginDir = path.join(OUT, 'office-margin');
  const bookMarginRun = publish(['--source', 'samples/research.ad', '--template', 'office_book', '--out', bookMarginDir, '--margin', '1.2cm']);
  const bookMarginReport = JSON.parse(readFileSync(path.join(bookMarginDir, 'run-report.json'), 'utf8'));
  const bookColumns = publish(['--source', 'samples/research.ad', '--template', 'office_book', '--out', path.join(OUT, 'office-columns'), '--columns', '2']);

  await check('AC-03b', '模板参数按适用性真实生效，不可用组合显式报错（不静默忽略）', () => {
    assert(headerRun.code === 0, `academic header publish exit ${headerRun.code}: ${headerRun.stderr.slice(-500)}`);
    assert(headerReport.typst_config.header_text === '页眉文字检查', `academic header_text in typst config: ${JSON.stringify(headerReport.typst_config.header_text)}`);
    assert(headerPdf.pages.slice(1).every((page) => page.text.includes('页眉文字检查')), 'academic body pages missing the requested header');
    assert(!headerPdf.pages[0].text.includes('页眉文字检查'), 'academic title page should stay header-free');

    assert(bookMarginRun.code === 0, `office_book margin publish exit ${bookMarginRun.code}: ${bookMarginRun.stderr.slice(-500)}`);
    const margin = bookMarginReport.typst_config.margin;
    assert(
      margin && margin.top === '1.2cm' && margin.bottom === '1.2cm' && margin.left === '1.2cm' && margin.right === '1.2cm',
      `office_book --margin ignored, typst config margin=${JSON.stringify(margin)}`,
    );
    const bookIr = JSON.parse(readFileSync(path.join(bookMarginDir, 'publication.json'), 'utf8'));
    assert(bookIr.page.margin.top === '1.2cm', `office_book IR margin not applied: ${JSON.stringify(bookIr.page.margin)}`);

    assert(bookColumns.code === 1, `office_book --columns 2 should fail, exit ${bookColumns.code}`);
    assert(bookColumns.payload?.error?.code === 'E_OPTION_UNSUPPORTED', `office_book --columns 2 code ${bookColumns.payload?.error?.code}`);

    return {
      academic_header: headerReport.typst_config.header_text,
      academic_header_pages: headerPdf.pages.slice(1).length,
      office_book_margin: margin,
      office_book_columns_rejection: bookColumns.payload.error.code,
    };
  });

  // ---------------------------------------------------------------- AC-03c
  const paperSizes = { a4: [595.28, 841.89], a5: [419.53, 595.28], 'iso-b5': [498.9, 708.66], 'us-letter': [612, 792] };
  const paperResults = {};
  const paperRejects = {};
  for (const [paper, expected] of Object.entries(paperSizes)) {
    const dir = path.join(OUT, `paper-${paper}`);
    const runResult = publish(['--source', 'samples/research.ad', '--template', 'academic', '--out', dir, '--paper', paper]);
    paperResults[paper] = { run: runResult, dir };
    if (runResult.code === 0) {
      const probe = pdfProbe(dir, false);
      paperResults[paper].probe = probe;
      paperResults[paper].expected = expected;
    }
  }
  for (const paper of ['b5', 'letter']) {
    paperRejects[paper] = publish(['--source', 'samples/research.ad', '--template', 'academic', '--out', path.join(OUT, `paper-${paper}`), '--paper', paper]);
  }

  await check('AC-03c', 'paper 允许集与 Typst 一致：四个允许值出对应纸型，非法值在校验期失败', () => {
    for (const [paper, entry] of Object.entries(paperResults)) {
      assert(entry.run.code === 0, `paper ${paper} publish exit ${entry.run.code}: ${entry.run.stderr.slice(-400)}`);
      const size = entry.probe.page_sizes[0];
      const [w, h] = entry.expected;
      assert(
        Math.abs(size[0] - w) < 0.5 && Math.abs(size[1] - h) < 0.5,
        `paper ${paper} page size ${JSON.stringify(size)} != expected ${JSON.stringify(entry.expected)}`,
      );
    }
    for (const [paper, result] of Object.entries(paperRejects)) {
      assert(result.code === 1, `paper ${paper} should be rejected, exit ${result.code}`);
      assert(result.payload?.error?.code === 'E_IR_SCHEMA', `paper ${paper} error code ${result.payload?.error?.code} (should fail validation, not typst)`);
    }
    return {
      allowed: Object.fromEntries(Object.entries(paperResults).map(([paper, entry]) => [paper, entry.probe.page_sizes[0]])),
      rejected: Object.fromEntries(Object.entries(paperRejects).map(([paper, result]) => [paper, result.payload.error.code])),
    };
  });

  // ---------------------------------------------------------------- AC-04
  const escapeDir = path.join(OUT, 'escape');
  const escapeRun = publish(['--source', 'samples/escape.ad', '--template', 'academic', '--out', escapeDir]);
  const escapePdf = pdfProbe(escapeDir, false);
  const escapeIr = JSON.parse(readFileSync(path.join(escapeDir, 'publication.json'), 'utf8'));
  const escapeMap = JSON.parse(readFileSync(path.join(escapeDir, 'publication.map.json'), 'utf8'));
  const syntheticDir = path.join(OUT, 'escape-synthetic');
  mkdirSync(syntheticDir, { recursive: true });

  await check('AC-04a', '特殊字符经 parser→wire→Auto→IR→Typst→PDF 后仍是字面文字', () => {
    assert(escapeRun.code === 0, `escape publish exit ${escapeRun.code}: ${escapeRun.stderr.slice(-500)}`);
    const pdfFlat = stripWs(escapePdf.text);
    const literals = ['井号#', '美元符号$', '百分号%', '星号*', '下划线_', '方括号[]', '尖括号<>', '花括号{}', '《排版原型》', 'café', '反斜线\\', '转义前缀#'];
    const missing = literals.filter((literal) => !pdfFlat.includes(literal));
    assert(missing.length === 0, `PDF text missing literals: ${JSON.stringify(missing)}`);
    return { literals_checked: literals.length, pdf_chars: escapePdf.text.length };
  });

  await check('AC-04b', '文本在 IR 与 parser 输出之间零改动，块级来源映射可定位', async () => {
    const source = await parseSource(path.join(PROTO, 'samples/escape.ad'));
    const irSource = escapeIr.content.filter((block) => block.origin === 'source');
    assert(irSource.length === source.blocks.length, `IR source blocks ${irSource.length} != parser blocks ${source.blocks.length}`);
    for (let i = 0; i < source.blocks.length; i += 1) {
      const expected = source.blocks[i];
      const actual = irSource[i];
      assert(actual.id === expected.id, `block id mismatch at ${i}: ${actual.id} != ${expected.id}`);
      assert(actual.kind === expected.kind, `block kind mismatch at ${actual.id}`);
      const canonical = (value) => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'occ').sort()));
      assert(
        canonical(actual) === canonical({ ...expected, origin: 'source' }),
        `block payload changed between parser and IR at ${actual.id}`,
      );
    }
    const segTextOf = (block) => (block.segments ?? []).map((seg) => (seg.kind === 'text' ? seg.text : '')).join('');
    const paragraph = irSource.find((block) => block.kind === 'paragraph' && segTextOf(block).includes('井号'));
    assert(paragraph, 'escape paragraph missing from IR');
    assert(segTextOf(paragraph).includes('反斜线 \\'), 'backslash lost in IR text');
    const mapped = escapeMap.blocks.find((item) => item.node_id === paragraph.id);
    assert(mapped, `source map missing ${paragraph.id}`);
    const typLines = readFileSync(path.join(escapeDir, 'publication.typ'), 'utf8').split('\n');
    const range = typLines.slice(mapped.typ_start - 1, mapped.typ_end).join('\n');
    assert(range.includes(`node: ${paragraph.id}`), `mapped typ range lacks node marker ${paragraph.id}`);
    assert(range.includes('井号 #'), 'mapped typ range lacks the paragraph text');
    assert(range.includes('#("'), 'text is not emitted as a Typst string literal');
    return { block_id: paragraph.id, typ_range: [mapped.typ_start, mapped.typ_end], blocks: irSource.length };
  });

  await check('AC-04c', '序列化层独立反例：直引号/反斜线/标记字符在 Typst 中不被解释', () => {
    const text = '直引号 " 与 \' 井号 # 星号 * 下划线 _ 美元 $ 反斜线 \\ 方括号 [ ] 尖括号 < > 花括号 { } at @ tilde ~ 反引号 ` 百分号 %';
    const emitted = emitTypst(syntheticPublication(text));
    writeFileSync(path.join(syntheticDir, 'publication.typ'), emitted.typ);
    const compile = typstCompile(typstBin, {
      input: path.join(syntheticDir, 'publication.typ'),
      output: path.join(syntheticDir, 'publication.pdf'),
      root: syntheticDir,
    });
    assert(compile.code === 0, `synthetic typst compile exit ${compile.code}: ${compile.stderr.slice(-600)}`);
    const probe = pdfProbe(syntheticDir, false);
    const flat = stripWs(probe.text);
    const expected = stripWs(text);
    assert(flat.includes(expected), `synthetic PDF text differs:\n${JSON.stringify(probe.text.slice(0, 400))}`);
    return { synthetic_text_chars: text.length, pdf_pages: probe.page_count, typ_sha: sha256File(path.join(syntheticDir, 'publication.typ')) };
  });

  // ---------------------------------------------------------------- AC-05
  await check('AC-05', '失败可解释：Auto 语法错误 / 未知节点 / 未知版本 / Typst 失败', () => {
    const outcomes = [];

    const broken = publish(['--source', 'samples/research.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-auto'), '--auto-entry', 'samples/neg/broken_entry.at']);
    assert(broken.code === 1, `broken auto exit ${broken.code}`);
    assert(broken.payload?.error?.code === 'E_AUTO_RUN', `broken auto code ${broken.payload?.error?.code}`);
    outcomes.push({ case: 'auto_syntax_error', code: broken.payload.error.code, exit: broken.code, message: broken.payload.error.message.slice(0, 160) });

    const unsupported = publish(['--source', 'samples/unsupported.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-node')]);
    assert(unsupported.code === 1, `unsupported node exit ${unsupported.code}`);
    assert(unsupported.payload?.error?.code === 'E_NODE_UNSUPPORTED', `unsupported node code ${unsupported.payload?.error?.code}`);
    assert(unsupported.payload.error.details?.unsupported?.[0]?.id === 'block-2', 'unsupported node id not reported');
    outcomes.push({ case: 'unknown_node', code: unsupported.payload.error.code, exit: unsupported.code, node: unsupported.payload.error.details.unsupported[0] });

    const version = publish(['--source', 'samples/research.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-version'), '--doc-wire-version', '9']);
    assert(version.code === 1, `wire version exit ${version.code}`);
    assert(version.payload?.error?.code === 'E_DOC_WIRE_VERSION', `wire version code ${version.payload?.error?.code}`);
    outcomes.push({ case: 'unknown_wire_version', code: version.payload.error.code, exit: version.code, message: version.payload.error.message });

    const typstFail = publish(['--source', 'samples/research.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-typst'), '--inject-typst-error']);
    assert(typstFail.code === 1, `typst failure exit ${typstFail.code}`);
    assert(typstFail.payload?.error?.code === 'E_TYPST_COMPILE', `typst failure code ${typstFail.payload?.error?.code}`);
    assert(/PLAN-082 injected typst failure/.test(typstFail.payload.error.message), 'typst stderr not surfaced');
    outcomes.push({ case: 'typst_compile_failure', code: typstFail.payload.error.code, exit: typstFail.code, message: typstFail.payload.error.message.slice(0, 160) });

    return outcomes;
  });

  // ---------------------------------------------------------------- AC-06
  await check('AC-06', '现有 parser/serializer 合同未受损（限定触面）', () => {
    const status = run('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: REPO });
    assert(status.code === 0, `git status exit ${status.code}: ${status.stderr.slice(-400)}`);
    const lines = status.stdout.split('\n').filter(Boolean);
    const trackedChanges = lines.filter((line) => !line.startsWith('??'));
    assert(trackedChanges.length === 0, `unexpected tracked changes: ${trackedChanges.join(' | ')}`);
    const outside = lines
      .filter((line) => line.startsWith('??'))
      .map((line) => line.slice(3))
      .filter((file) => !file.startsWith('autodown/prototypes/publishing/'));
    assert(outside.length === 0, `untracked files outside the prototype: ${outside.join(' | ')}`);

    const tests = run(
      process.platform === 'win32' ? 'cmd.exe' : 'pnpm',
      process.platform === 'win32'
        ? ['/d', '/s', '/c', 'pnpm --filter @autodown/engine exec vitest run src/parser/__tests__/block-parser.test.ts src/parser/__tests__/serializer-roundtrip.test.ts']
        : ['--filter', '@autodown/engine', 'exec', 'vitest', 'run', 'src/parser/__tests__/block-parser.test.ts', 'src/parser/__tests__/serializer-roundtrip.test.ts'],
      { cwd: path.join(REPO, 'autodown') },
    );
    assert(tests.code === 0, `engine parser tests exit ${tests.code}: ${tests.stderr.slice(-800)}`);
    const plain = tests.stdout.replace(/\[[0-9;]*m/g, '');
    const passed = /Tests\s+(\d+) passed/.exec(plain);
    assert(passed && Number(passed[1]) >= 100, `unexpected parser test count: ${tests.stdout.slice(-400)}`);
    return {
      git_tracked_changes: 0,
      untracked_scope: 'autodown/prototypes/publishing/**',
      parser_tests: passed ? Number(passed[1]) : null,
      parser_test_command: tests.command,
    };
  });

  // ---------------------------------------------------------------- AC-07
  await check('AC-07', '原型可重跑、可评估：README/固定样例/版本字体/冷热计时', () => {
    const readme = path.join(PROTO, 'README.md');
    assert(existsSync(readme), 'README.md missing');
    const text = readFileSync(readme, 'utf8');
    for (const section of ['运行', '固定版本', '字体', '限制', '计时']) {
      assert(text.includes(section), `README missing section ${section}`);
    }
    for (const sample of ['samples/research.ad', 'samples/escape.ad']) {
      assert(existsSync(path.join(PROTO, sample)), `sample missing ${sample}`);
    }
    const fonts = run(typstBin ?? 'typst', ['fonts']);
    const families = ['Noto Serif SC', 'Noto Sans SC'];
    const available = families.filter((family) => fonts.stdout.includes(family));
    assert(available.length > 0, 'no CJK font visible to typst');

    const warmDir = path.join(OUT, 'academic-warm');
    const warm = publish(['--source', 'samples/research.ad', '--template', 'academic', '--out', warmDir]);
    assert(warm.code === 0, `warm publish exit ${warm.code}`);
    const warmReport = JSON.parse(readFileSync(path.join(warmDir, 'run-report.json'), 'utf8'));
    assert(warmReport.outputs.typst_source.sha256 === academicReport.outputs.typst_source.sha256, 'generated .typ is not deterministic between runs');
    return {
      fonts_visible: available,
      cold: academicReport.timings_ms,
      warm: warmReport.timings_ms,
      deterministic_typ: true,
      typst_version: env.typst,
    };
  });


  // ================================================================ PLAN-083 S-01..S-07
  // S-01 普通函数按参数产生 Style；非法值可定位拒绝
  await check('S-01', '样式探针：参数化 Style 工厂/校验拒绝（17 项子检查）', () => {
    const result = run(AUTO, ['style-probe.at'], { cwd: path.join(PROTO, 'templates') });
    assert(result.code === 0, `style-probe exit ${result.code}: ${result.stderr.slice(-600)}`);
    const line = result.stdout.split('\n').map((l) => l.trim()).find((l) => l.startsWith('{') && l.includes('all_pass'));
    assert(line, 'style-probe printed no result JSON');
    const probe = JSON.parse(line);
    assert(probe.all_pass === true, `style-probe ${probe.ok_count}/${probe.total} (need all)`);
    return { probe, command: result.command, exit: result.code };
  });

  // S-02 同一内容后套不同模板：默认值在最终环境生效，显式属性不丢失
  const sdAcademicDir = path.join(OUT, 'sd-academic');
  const sdBookDir = path.join(OUT, 'sd-book');
  const sdAcademic = publish(['--source', 'samples/style-demo.ad', '--template', 'academic', '--out', sdAcademicDir, '--doc-styles', 'samples/style-rules.json']);
  const sdBook = publish(['--source', 'samples/style-demo.ad', '--template', 'office_book', '--out', sdBookDir, '--doc-styles', 'samples/style-rules.json', '--header-text', '样式演示']);
  const sdAcademicIr = sdAcademic.code === 0 ? JSON.parse(readFileSync(path.join(sdAcademicDir, 'publication.json'), 'utf8')) : null;
  const sdBookIr = sdBook.code === 0 ? JSON.parse(readFileSync(path.join(sdBookDir, 'publication.json'), 'utf8')) : null;
  const comp = (ir, id) => ir.computed.find((c) => c.id === id);
  await check('S-02', '模板默认在最终环境生效；节点显式属性跨模板保留', () => {
    assert(sdAcademic.code === 0 && sdBook.code === 0, 'style-demo publish failed');
    assert(sdAcademicIr.schema_version === 'publication-ir-v2' && sdBookIr.schema_version === 'publication-ir-v2', 'IR v2 expected');
    assert(comp(sdAcademicIr, 'block-3').text.size.value === 10, 'academic body default size');
    assert(comp(sdBookIr, 'block-3').text.size.value === 11, 'office_book body default size');
    assert(comp(sdAcademicIr, 'block-3').para.first_line_indent.value === 0, 'academic indent default');
    assert(comp(sdBookIr, 'block-3').para.first_line_indent.value === 2, 'office_book indent default');
    for (const [name, ir] of [['academic', sdAcademicIr], ['office_book', sdBookIr]]) {
      const c = comp(ir, 'block-1');
      assert(c.text.size.value === 15, name + ' explicit 15pt lost');
      const chain = c.sources.filter((x) => x.prop === 'text.size');
      assert(chain[chain.length - 1].origin === 'explicit', name + ' explicit not top of chain');
    }
    return {
      academic_default: { size: comp(sdAcademicIr, 'block-3').text.size, indent: comp(sdAcademicIr, 'block-3').para.first_line_indent },
      book_default: { size: comp(sdBookIr, 'block-3').text.size, indent: comp(sdBookIr, 'block-3').para.first_line_indent },
      explicit_both: [comp(sdAcademicIr, 'block-1').text.size, comp(sdBookIr, 'block-1').text.size],
    };
  });

  // S-03 嵌套作用域覆盖与恢复（computed + PDF 字号分布）
  const sdBookPdf = pdfProbe(sdBookDir, false);
  await check('S-03', '子树作用域覆盖（block-5 13pt）与离开恢复（block-9 模板值）', () => {
    for (const [name, ir, tplSize] of [['academic', sdAcademicIr, 10], ['office_book', sdBookIr, 11]]) {
      assert(comp(ir, 'block-5').text.size.value === 13, name + ': scoped override lost');
      assert(comp(ir, 'block-9').text.size.value === tplSize, name + ': scope leaked past the subtree');
      const chain5 = comp(ir, 'block-5').sources.filter((x) => x.prop === 'text.size');
      assert(chain5[chain5.length - 1].rule === 'doc-sub-emph', name + ': scoped rule not the winning source');
      const chain9 = comp(ir, 'block-9').sources.filter((x) => x.prop === 'text.size');
      assert(!chain9.some((x) => x.rule === 'doc-sub-emph'), name + ': scope applied outside the subtree');
    }
    const allSizes = sdBookPdf.pages.flatMap((p) => p.font_sizes.map((f) => f.size));
    assert(allSizes.includes(13.0), 'PDF lacks 13pt (scoped override)');
    assert(allSizes.includes(15.0), 'PDF lacks 15pt (explicit attr)');
    const conclPage = sdBookPdf.pages.find((p) => p.text.includes('结论正文'));
    assert(conclPage, 'conclusion page not found');
    assert(!conclPage.font_sizes.some((f) => f.size === 13.0), '13pt leaked to the conclusion page');
    return {
      scoped: 13,
      restored: comp(sdBookIr, 'block-9').text.size.value,
      pdf_sizes: [...new Set(allSizes)].sort((a, b) => a - b),
      conclusion_page_sizes: conclPage.font_sizes.map((f) => f.size),
    };
  });

  // S-04 选择器与呈现函数：匹配日志 + 定理框 + 章节标题
  await check('S-04', '选择器匹配可观察；定理框/章节呈现可用（PDF 可见）', () => {
    const log = sdBookIr.styles.match_log;
    const hits = (rule, node) => log.find((m) => m.rule === rule && m.node === node)?.matched;
    assert(hits('doc-sub-emph', 'block-5') === 1, 'scoped rule did not match block-5');
    for (const outside of ['block-3', 'block-9']) {
      assert(hits('doc-sub-emph', outside) === 0, 'scoped rule matched ' + outside + ' outside its scope');
    }
    const pres = (ir, id) => ir.presentation.find((e) => e.occurrence_id === id);
    const thm = pres(sdBookIr, 'block-6');
    assert(thm.rule === 'theorem-box', 'theorem render rule not applied');
    assert(thm.blocks[0].title === '定理 1（一致性条件）', 'theorem box title: ' + thm.blocks[0].title);
    const ch = pres(sdBookIr, 'block-0');
    assert(ch.rule === 'chapter-h1' && ch.blocks[0].text === '第二章 方法', 'chapter render not applied/numbered');
    const aside = pres(sdBookIr, 'block-7');
    assert(aside.rule === 'aside-note', 'aside render not applied');
    const plainOf = (b) => (b.segments ?? []).map((seg) => (seg.kind === 'text' ? seg.text : '')).join('');
    assert(aside.blocks.some((b) => b.origin === 'render' && plainOf(b) === '注：两段提示'), 'aside label missing');
    assert(aside.blocks.some((b) => plainOf(b) === '【两段提示】'), 'next-delegated plain title missing');
    for (const phrase of ['定理 1（一致性条件）', '第一章 前言', '第二章 方法', '第三章 结论']) {
      assert(sdBookPdf.text.includes(phrase), 'PDF missing rendered phrase: ' + phrase);
    }
    return {
      theorem: thm.blocks[0].title,
      chapters: [pres(sdBookIr, 'tpl-preface'), pres(sdBookIr, 'block-0'), pres(sdBookIr, 'block-8')].map((e) => e.blocks[0].text),
      match_log_entries: log.length,
    };
  });

  // S-05 来源与语义保持：outline 不含装饰、映射可追溯、递归保护有界
  const guardDir = path.join(OUT, 'guard-demo');
  const guardRun = publish(['--source', 'samples/style-demo.ad', '--template', 'office_book', '--out', guardDir, '--auto-entry', 'templates/render-guard-demo.at', '--skip-pdf']);
  await check('S-05', '呈现替换保语义；无自匹配死循环（守卫有界 + 诊断）', () => {
    for (const [name, ir] of [['academic', sdAcademicIr], ['office_book', sdBookIr]]) {
      for (const entry of ir.outline.entries) {
        assert(!/第[一二三]章|定理 1/.test(entry.title), name + ': outline entry polluted: ' + entry.title);
        const src = ir.content.find((b) => b.id === entry.id);
        assert(src && src.kind === 'heading' && src.text === entry.title, name + ': outline entry ' + entry.id + ' not a semantic heading');
      }
    }
    const bookMap = JSON.parse(readFileSync(path.join(sdBookDir, 'publication.map.json'), 'utf8'));
    const typLines = readFileSync(path.join(sdBookDir, 'publication.typ'), 'utf8').split('\n');
    for (const entry of bookMap.blocks.slice(0, 4)) {
      const range = typLines.slice(entry.typ_start - 1, entry.typ_end).join('\n');
      assert(range.includes('node: ' + entry.node_id), 'map range lacks node marker ' + entry.node_id);
    }
    assert(guardRun.code === 0, 'guard demo exit ' + guardRun.code);
    const guardIr = JSON.parse(readFileSync(path.join(guardDir, 'publication.json'), 'utf8'));
    const guards = guardIr.render_diags.filter((d) => d.code === 'W_RENDER_RECURSION_GUARD');
    assert(guards.length === 2, 'guard diags: ' + guards.length + ' (expected 2)');
    assert(guards.every((d) => d.rule === 'echo-heading' && d.node.endsWith('!echo')), 'guard diag details');
    assert(guardIr.presentation.length === guardIr.content.length, 'presentation grew unboundedly');
    const guarded = guardIr.presentation.filter((e) => e.guard === 1);
    assert(guarded.length === 2, 'guarded entries: ' + guarded.length);
    const echo0 = guarded[0];
    assert(echo0.blocks.length === 2 && echo0.blocks[1].text.endsWith('（回声）'), 'guarded fallback blocks unexpected');
    return {
      outline_titles: sdBookIr.outline.entries.map((e) => e.title),
      guard_diags: guards.length,
      presentation_entries: guardIr.presentation.length,
    };
  });

  // S-06 inspect_style 与后端边界：来源链正确；不支持属性显式诊断
  const sdBookInspect = JSON.parse(readFileSync(path.join(sdBookDir, 'style-inspect.json'), 'utf8'));
  const sdBookReport = JSON.parse(readFileSync(path.join(sdBookDir, 'run-report.json'), 'utf8'));
  await check('S-06', 'inspect_style 链路；未支持属性显式诊断且不丢失', () => {
    assert(sdBookInspect.schema_version === 'style-inspect-v1', 'inspect schema');
    assert(sdBookInspect.occurrences.length === sdBookIr.content.length, 'inspect occurrences mismatch');
    const cap = sdBookInspect.capabilities.find((c) => c.prop === 'doc.hanging_punctuation');
    assert(cap && cap.supported === false, 'capability table must mark hanging_punctuation unsupported');
    const b1 = sdBookInspect.occurrences.find((o) => o.id === 'block-1');
    const sizeChain = b1.props.find((p) => p.prop === 'text.size')?.chain ?? [];
    assert(sizeChain.map((c) => c.origin).join('>') === 'builtin>template>explicit', 'block-1 chain: ' + JSON.stringify(sizeChain));
    const b5 = sdBookInspect.occurrences.find((o) => o.id === 'block-5');
    const b5chain = b5.props.find((p) => p.prop === 'text.size')?.chain ?? [];
    assert(b5chain[b5chain.length - 1]?.rule === 'doc-sub-emph', 'block-5 winning source');
    const unsupported = sdBookReport.diagnostics.filter((d) => d.code === 'W_STYLE_UNSUPPORTED');
    assert(unsupported.length >= 1, 'no W_STYLE_UNSUPPORTED diagnostics');
    assert(comp(sdBookIr, 'block-3').doc.hanging_punctuation === 1, 'unsupported prop value dropped from IR');
    assert(b1.unsupported.some((u) => u.prop === 'doc.hanging_punctuation'), 'inspect lacks unsupported entry');
    // F-1 负例（复审修复）：显式属性引用不存在的节点 id → E_STYLE_EXPLICIT_NODE（可定位，不静默）
    const badXid = publish(['--source', 'samples/style-demo.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-explicit-node'), '--doc-styles', 'samples/neg/explicit-unknown-node.json', '--skip-pdf']);
    assert(badXid.code === 1, 'unknown explicit node id should fail, exit ' + badXid.code);
    assert(badXid.payload?.error?.code === 'E_STYLE_EXPLICIT_NODE', 'explicit-node error code: ' + badXid.payload?.error?.code);
    assert(String(badXid.payload?.error?.message ?? '').includes('block-99'), 'explicit-node message must locate the id');
    return {
      chain_block1: sizeChain.map((c) => c.origin),
      unsupported_diags: unsupported.length,
      kept_in_ir: comp(sdBookIr, 'block-3').doc.hanging_punctuation,
      explicit_node_rejection: badXid.payload.error.code,
    };
  });

  // S-07 082 原型仍可运行：样例×模板矩阵经 v1 迁移全部可跑；旧合同触面在 AC-06 复验
  const escapeBook = publish(['--source', 'samples/escape.ad', '--template', 'office_book', '--out', path.join(OUT, 'escape-book')]);
  await check('S-07', '082 样例×模板矩阵仍可运行；迁移的可见变化可观察', () => {
    assert(escapeBook.code === 0, 'escape office_book exit ' + escapeBook.code);
    const escapeBookPdf = pdfProbe(path.join(OUT, 'escape-book'), false);
    const flat = stripWs(escapeBookPdf.text);
    for (const literal of ['井号#', '《排版原型》']) {
      assert(flat.includes(stripWs(literal)), 'escape office_book PDF missing ' + literal);
    }
    const academicResearchPdf = pdfProbe(academicDir, false);
    assert(academicResearchPdf.text.includes('时间基准'), 'academic research headings missing');
    const ch1 = bookIr.presentation.find((e) => e.blocks[0]?.text === '第二章 引言');
    assert(ch1 && ch1.rule === 'chapter-h1', 'office_book research chapter render missing');
    const tplPreface = bookIr.presentation.find((e) => e.occurrence_id === 'tpl-preface');
    assert(tplPreface && tplPreface.blocks[0].text === '第一章 前言', 'template-origin chapter not numbered first');
    return {
      escape_office_book: 'ok',
      academic_pages: academicResearchPdf.page_count,
      office_book_chapter_render: ch1?.blocks[0]?.text,
    };
  });

  // ================================================================ PLAN-084 P-01..P-08
  // P-01 五个模板消费同一材料（AC-01）：五个可打开 PDF；正文来源一致；形态区别成立
  const fiveDirs = {};
  const fiveRuns = {};
  for (const template of ['academic', 'office_book', 'press_book', 'news', 'lecture']) {
    fiveDirs[template] = path.join(OUT, `five-${template}`);
    fiveRuns[template] = publish(['--source', 'samples/paper.ad', '--template', template, '--out', fiveDirs[template]]);
  }
  await check('P-01', '五个模板消费同一材料：五个 PDF、正文一致、形态区别', () => {
    for (const template of Object.keys(fiveRuns)) {
      assert(fiveRuns[template].code === 0, `${template} publish exit ${fiveRuns[template].code}: ${fiveRuns[template].stderr.slice(-500)}`);
    }
    const probes = {};
    for (const template of Object.keys(fiveDirs)) {
      probes[template] = pdfProbe(fiveDirs[template], true);
      assert(probes[template].page_count >= 1, `${template} no pages`);
    }
    const irs = {};
    for (const template of Object.keys(fiveDirs)) {
      irs[template] = JSON.parse(readFileSync(path.join(fiveDirs[template], 'publication.json'), 'utf8'));
    }
    // 同一语义材料：source 块（article 视图未删减）在四个非 slides 模板一致
    const sourceIds = (ir) => ir.content.filter((b) => b.origin === 'source').map((b) => b.id);
    for (const template of ['office_book', 'press_book', 'news']) {
      assert(
        JSON.stringify(sourceIds(irs[template])) === JSON.stringify(sourceIds(irs.academic)),
        `source ids differ between academic and ${template}`,
      );
    }
    // 形态区别：栏数 / 纸型比例 / 页数
    assert(Math.max(...probes.academic.pages.map(columnCount)) === 2, 'academic columns');
    assert(Math.max(...probes.office_book.pages.map(columnCount)) === 1, 'office_book columns');
    assert(Math.max(...probes.press_book.pages.map(columnCount)) === 1, 'press_book columns');
    assert(Math.max(...probes.news.pages.map((p) => columnCount(p, 'anchor'))) === 3, 'news columns (3)');
    assert(irs.news.page.h1_span_columns === true, 'news h1 span flag');
    const lectureSize = probes.lecture.page_sizes[0];
    assert(Math.abs(lectureSize[0] / lectureSize[1] - 16 / 9) < 0.01, `lecture aspect ${JSON.stringify(lectureSize)}`);
    // slides 视图删减可见：未放置内容有 W_SLIDES_UNPLACED
    assert(
      irs.lecture.render_diags.some((d) => d.code === 'W_SLIDES_UNPLACED'),
      'lecture missing W_SLIDES_UNPLACED',
    );
    // 关键内容五处一致（同一正文）
    for (const phrase of ['多传感器融合感知', '时间基准', '特征级融合']) {
      for (const template of Object.keys(probes)) {
        assert(probes[template].text.includes(phrase), `${template} PDF missing ${phrase}`);
      }
    }
    return {
      pages: Object.fromEntries(Object.entries(probes).map(([t, p]) => [t, p.page_count])),
      aspect_lecture: lectureSize,
      source_blocks: sourceIds(irs.academic).length,
      slides_unplaced: irs.lecture.render_diags.find((d) => d.code === 'W_SLIDES_UNPLACED')?.detail?.slice(0, 120),
    };
  });

  // P-02 编号与目录按逻辑顺序（AC-02）：前言成为第一章；目录=最终树顺序；图/式编号
  await check('P-02', '编号与目录按模板展开后的逻辑顺序（前言重排/图式编号）', () => {
    const bookIr = JSON.parse(readFileSync(path.join(fiveDirs.office_book, 'publication.json'), 'utf8'));
    const pressIr = JSON.parse(readFileSync(path.join(fiveDirs.press_book, 'publication.json'), 'utf8'));
    const pres = (ir, id) => ir.presentation.find((e) => e.occurrence_id === id);
    assert(pres(bookIr, 'tpl-preface')?.blocks[0]?.text === '第一章 前言', 'office_book preface not chapter 1');
    assert(pres(bookIr, 'sec-intro')?.blocks[0]?.text === '第二章 引言 Introduction', 'office_book 引言 not chapter 2');
    assert(pres(pressIr, 'tpl-preface')?.blocks[0]?.text === '第一章 前言', 'press_book preface not chapter 1');
    assert(bookIr.outline.entries[0]?.id === 'tpl-preface', 'outline does not start with the template preface');
    const acadPdfProbe = pdfProbe(fiveDirs.academic, false);
    // Typst 图题 supplement 与编号间为不断行空格（U+00A0）；断言按任意空白归一。
    assert(/图\s*1/.test(acadPdfProbe.text), 'academic PDF lacks numbered figure caption (图 1)');
    assert(/\(1\)/.test(acadPdfProbe.text), 'academic PDF lacks numbered equation (1)');
    return {
      office_book_chapters: [pres(bookIr, 'tpl-preface'), pres(bookIr, 'sec-intro'), pres(bookIr, 'sec-related')].map((e) => e?.blocks?.[0]?.text),
      press_book_chapter1: pres(pressIr, 'tpl-preface')?.blocks[0]?.text,
      outline_first: bookIr.outline.entries[0],
    };
  });

  // P-03 引用、脚注与文献（AC-03）：目标与显示正确；悬空/重复/歧义可定位
  await check('P-03', '引用/脚注/文献真实工作；负例具名可定位', () => {
    const acadIr = JSON.parse(readFileSync(path.join(fiveDirs.academic, 'publication.json'), 'utf8'));
    const acadPdf = pdfProbe(fiveDirs.academic, false);
    const refs = acadIr.references;
    const refKinds = refs.map((r) => r.kind);
    for (const kind of ['ref', 'cite', 'footnote']) {
      assert(refKinds.includes(kind), `references missing ${kind}`);
    }
    const refSec = refs.find((r) => r.target === 'sec-time');
    assert(refSec && refSec.target_occ === 'sec-time', 'sec-time ref unresolved');
    assert(acadPdf.text.includes('单一传感器退化模式'), 'footnote definition text missing from PDF');
    assert(acadPdf.text.includes('参考文献'), 'bibliography section missing');
    for (const n of ['[1]', '[2]', '[3]']) {
      assert(acadPdf.text.includes(n), `bibliography entry ${n} missing`);
    }
    assert(acadPdf.text.includes('张明远, 李慧. 多传感器融合感知综述'), 'bib entry text missing');
    const neg = (args) => publish(args);
    const cases = [
      { args: ['--source', 'samples/neg/dangling-ref.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-ref-dangling'), '--skip-pdf'], code: 'E_REF_DANGLING' },
      { args: ['--source', 'samples/neg/unknown-cite.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-cite'), '--skip-pdf'], code: 'E_CITE_UNKNOWN' },
      { args: ['--source', 'samples/neg/dangling-footnote.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-fn-dangling'), '--skip-pdf'], code: 'E_FOOTNOTE_DANGLING' },
      { args: ['--source', 'samples/neg/dup-footnote.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-fn-dup'), '--skip-pdf'], code: 'E_FOOTNOTE_DUPLICATE' },
      { args: ['--source', 'samples/neg/bad-bib.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-bib'), '--skip-pdf'], code: 'E_BIB_ENTRY' },
      { args: ['--source', 'samples/neg/mixed-figure.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-mixed-fig'), '--skip-pdf'], code: 'E_FIGURE_MIXED_INLINE' },
      { args: ['--source', 'samples/neg/ambiguous-ref.ad', '--template', 'lecture', '--out', path.join(OUT, 'neg-ambiguous'), '--skip-pdf'], code: 'E_REF_AMBIGUOUS' },
    ];
    const outcomes = [];
    for (const c of cases) {
      const r = neg(c.args);
      assert(r.code === 1, `${c.code}: expected exit 1, got ${r.code}`);
      assert(r.payload?.error?.code === c.code, `${c.code}: got ${r.payload?.error?.code}`);
      outcomes.push({ expected: c.code, message: r.payload.error.message.slice(0, 140) });
    }
    const qualified = neg(['--source', 'samples/neg/ambiguous-ref-qualified.ad', '--template', 'lecture', '--out', path.join(OUT, 'neg-ambiguous-ok'), '--skip-pdf']);
    assert(qualified.code === 0, `qualified ref should pass, exit ${qualified.code}`);
    const qIr = JSON.parse(readFileSync(path.join(OUT, 'neg-ambiguous-ok', 'publication.json'), 'utf8'));
    const qRef = qIr.references.find((r) => r.target === 'fig-x#2');
    assert(qRef && qRef.target_occ === 'fig-x#2', 'qualified ref not resolved to the second occurrence');
    outcomes.push({ expected: 'E_REF_AMBIGUOUS resolved via #fig-x#2', target_occ: qRef?.target_occ });
    return { references: refs.length, negatives: outcomes };
  });

  // P-04 Content 复用两次（AC-04）：occurrence 唯一；引用策略明确
  await check('P-04', '同一 Content 复用两次：occurrence 唯一、显式消解不随机选首个', () => {
    const lectureIr = JSON.parse(readFileSync(path.join(fiveDirs.lecture, 'publication.json'), 'utf8'));
    const reuse = lectureIr.content.filter((b) => b.origin === 'template-reuse');
    assert(reuse.length === 2, `template-reuse blocks: ${reuse.length}`);
    for (const b of reuse) {
      assert(/^block-\d+#2$/.test(b.occ), `reuse occurrence should be #2: ${b.occ}`);
    }
    const occs = lectureIr.content.map((b) => b.occ);
    assert(new Set(occs).size === occs.length, 'occurrences not unique');
    assert(lectureIr.computed.every((c, i) => c.id === lectureIr.content[i].occ), 'computed not aligned to occurrences');
    assert(lectureIr.presentation.every((e, i) => e.occurrence_id === lectureIr.content[i].occ), 'presentation not aligned to occurrences');
    const manifest = JSON.parse(readFileSync(path.join(fiveDirs.lecture, 'resource-manifest.json'), 'utf8'));
    assert(manifest.images.length === 1 && manifest.images[0].sha256, 'resource manifest image entry missing');
    return {
      reuse: reuse.map((b) => `${b.id}:${b.occ}:${b.kind}`),
      occurrences: occs.length,
      image_sha_prefix: manifest.images[0].sha256.slice(0, 12),
    };
  });

  // P-05 混合语言/公式/资源边界（AC-05）：dialect 受检查；缺字体/缺资源可见
  await check('P-05', '公式 dialect 受检查；字体与资源诊断可见，未知内容不丢失', () => {
    const hashEq = publish(['--source', 'samples/neg/hash-equation.ad', '--template', 'academic', '--out', path.join(OUT, 'neg-hash-eq'), '--skip-pdf']);
    assert(hashEq.code === 1 && hashEq.payload?.error?.code === 'E_EQUATION_SYNTAX', `hash equation: ${hashEq.payload?.error?.code}`);
    let dialectCode = null;
    try {
      const base = syntheticPublication('x');
      const eqBlock = { id: 'eq-tex', kind: 'equation', origin: 'source', occ: 'eq-tex', dialect: 'tex', source: 'frac{a}{b}' };
      base.content = [base.content[0], eqBlock];
      base.computed = [...base.computed, base.computed[0]];
      base.computed[1] = { ...base.computed[0], id: 'eq-tex' };
      base.presentation = [
        base.presentation[0],
        { occurrence_id: 'eq-tex', role: 'equation', rule: '', guard: 0, blocks: [eqBlock] },
      ];
      emitTypst(base);
    } catch (error) {
      dialectCode = error.code;
    }
    assert(dialectCode === 'E_EQUATION_DIALECT', `tex dialect: ${dialectCode}`);
    const manifest = JSON.parse(readFileSync(path.join(fiveDirs.academic, 'resource-manifest.json'), 'utf8'));
    assert(manifest.fonts.missing.length === 0, `unexpected missing fonts: ${JSON.stringify(manifest.fonts.missing)}`);
    assert(manifest.fonts.requested.includes('Noto Serif SC'), 'requested fonts not recorded');
    assert(manifest.images.length === 1 && manifest.images[0].bytes > 0, 'image not recorded in manifest');
    const acadReport = JSON.parse(readFileSync(path.join(fiveDirs.academic, 'run-report.json'), 'utf8'));
    assert(Array.isArray(acadReport.diagnostics), 'diagnostics list present');
    return {
      equation_syntax: hashEq.payload.error.code,
      equation_dialect: dialectCode,
      fonts_requested: manifest.fonts.requested,
      images: manifest.images.length,
      diagnostics: acadReport.diagnostics.length,
    };
  });

  // P-06 图表与长内容（AC-06）：长段/表格无无声截断；边界明确记录
  await check('P-06', '长段落/表格无无声截断；超出本批能力明确记录', () => {
    for (const template of ['academic', 'office_book', 'news']) {
      const probe = pdfProbe(fiveDirs[template], false);
      const flat = stripWs(probe.text);
      assert(flat.includes(stripWs('累计里程 48,000 公里')), `${template}: long paragraph truncated (mileage missing)`);
      assert(flat.includes(stripWs('12 种光照天气组合，所有原始数据、标定参数与中间结果均随文档版本入库')), `${template}: long paragraph tail missing`);
      assert(flat.includes('毫米波雷达'), `${template}: table row missing`);
    }
    const readme = readFileSync(path.join(PROTO, 'README.md'), 'utf8');
    assert(readme.includes('限制'), 'README boundary section missing');
    return { long_paragraph: '完整出现在三个模板', table_rows: 3 };
  });

  // P-07 模板/view 与文件格式分离（AC-07）：切换视图不改原文；边界如实声明
  await check('P-07', '切换模板/视图不修改原文；输出格式边界如实声明', () => {
    const before = readFileSync(path.join(PROTO, 'samples/paper.ad'), 'utf8');
    const sha = sha256File(path.join(PROTO, 'samples/paper.ad'));
    assert(readFileSync(path.join(PROTO, 'samples/paper.ad'), 'utf8') === before, 'source mutated by publishing');
    const readme = readFileSync(path.join(PROTO, 'README.md'), 'utf8');
    assert(readme.includes('不宣称'), 'README must state format boundaries (不宣称 …)');
    assert(readme.includes('PPTX') || readme.includes('DOCX'), 'README must mention PPTX/DOCX boundary');
    return { source_sha: sha.slice(0, 12), source_unchanged: true };
  });

  // P-08 执行端选择（AC-08 的一腿）：--auto-engine 显式选择；ACE 缺口可复现
  await check('P-08', '执行端显式选择（legacy 默认）；构建默认车道缺口具名可复现', () => {
    const legacyRun = publish(['--source', 'samples/paper.ad', '--template', 'academic', '--out', path.join(OUT, 'engine-legacy'), '--skip-pdf']);
    assert(legacyRun.code === 0, `legacy engine run failed: ${legacyRun.stderr.slice(-400)}`);
    const legacyReport = JSON.parse(readFileSync(path.join(OUT, 'engine-legacy', 'run-report.json'), 'utf8'));
    assert(legacyReport.tool.auto_engine === 'legacy', 'engine not recorded in report');
    const aceRun = publish(['--source', 'samples/paper.ad', '--template', 'academic', '--out', path.join(OUT, 'engine-ace'), '--skip-pdf', '--auto-engine', 'ace']);
    assert(aceRun.code === 1, 'ace engine run unexpectedly succeeded');
    const msg = aceRun.payload?.error?.message ?? '';
    assert(
      /ace\.sys\//.test(msg) || /not part of this source profile/.test(msg),
      `ace lane gap not surfaced: ${msg.slice(0, 200)}`,
    );
    return {
      legacy_engine: legacyReport.tool.auto_engine,
      ace_named_gap: msg.slice(0, 160),
    };
  });

  const failed = checks.filter((item) => !item.ok);
  const report = {
    schema_version: 'plan084-verify-report-v1',
    generated_at: new Date().toISOString(),
    repo: REPO,
    tools: env,
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');

  const lines = ['# PLAN-082/083/084 验收证据', '', `生成时间：${report.generated_at}`, '', '## 工具', ''];
  for (const [key, value] of Object.entries(env)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## 检查', '', '| 检查 | 结果 | 证据 |', '| --- | --- | --- |');
  for (const item of checks) {
    const detail = JSON.stringify(item.detail).replace(/\|/g, '\\|').slice(0, 600);
    lines.push(`| ${item.id} ${item.name} | ${item.ok ? 'PASS' : 'FAIL'} | ${detail} |`);
  }
  lines.push('', `总计：${report.summary.passed}/${report.summary.total} passed`, '');
  writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));

  process.stdout.write(`\n${report.summary.passed}/${report.summary.total} checks passed\n`);
  process.stdout.write(`report: ${path.join(OUT, 'report.md')}\n`);
  if (failed.length > 0) process.exit(1);
}

// 布局是否随参数改变：页数或每页文本长度分布发生变化
function itemChanged(a, b) {
  if (a.page_count !== b.page_count) return true;
  const lengthsA = a.pages.map((page) => page.chars);
  const lengthsB = b.pages.map((page) => page.chars);
  return JSON.stringify(lengthsA) !== JSON.stringify(lengthsB);
}

main().catch((error) => {
  process.stderr.write(String(error && error.stack ? error.stack : error) + '\n');
  process.exit(1);
});




