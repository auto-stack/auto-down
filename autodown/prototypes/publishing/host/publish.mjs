#!/usr/bin/env node
// PLAN-082 — 出版原型入口：.ad → (engine parser) → doc-wire → 普通 Auto 模板求值 → IR → Typst → PDF
//
// 用法：
//   node host/publish.mjs --source samples/research.ad --template academic --out out/academic
//   node host/publish.mjs --source samples/research.ad --template office_book --out out/office_book \
//        --font-size 12pt --header-text "相机与激光雷达融合研究"
//
// 每一步的真实命令、退出码、耗时与产物哈希写入 <out>/run-report.json；
// 宿主只做解析/校验/发射，模板投影由 Auto 执行（templates/*.at）。

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSource, REPO_ROOT } from './doc-parse.mjs';
import { encodeDocWire, encodeRequest } from './wire.mjs';
import { encodeStylesWire } from './style-wire.mjs';
import { emitTypst, validatePublication, backendCapabilityDiagnostics, buildStyleInspect } from './emit-typst.mjs';
import { locateTypst, typstVersion, typstCompile, typstQuery, typstFonts, PINNED_TYPST_VERSION } from './typst.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTO_ROOT = path.resolve(HERE, '..');

function parseArgs(argv) {
  const opts = {
    source: path.join(PROTO_ROOT, 'samples/research.ad'),
    template: 'academic',
    out: path.join(PROTO_ROOT, 'out', 'academic'),
    autoEntry: path.join(PROTO_ROOT, 'templates/main.at'),
    docWireVersion: 2,
    view: undefined,
    skipPdf: false,
    fontPaths: [],
    autoEngine: 'legacy',
  };
  const takesValue = new Set([
    '--source',
    '--template',
    '--out',
    '--font-size',
    '--columns',
    '--paper',
    '--margin',
    '--header-text',
    '--auto-entry',
    '--doc-wire-version',
    '--font-path',
    '--view',
    '--doc-styles',
    '--auto-engine',
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--skip-pdf') {
      opts.skipPdf = true;
      continue;
    }
    if (arg === '--inject-typst-error') {
      opts.injectTypstError = true;
      continue;
    }
    if (!takesValue.has(arg)) {
      throw Object.assign(new Error(`unknown argument: ${arg}`), { code: 'E_ARGS' });
    }
    const value = argv[i + 1];
    if (value === undefined) {
      throw Object.assign(new Error(`argument ${arg} needs a value`), { code: 'E_ARGS' });
    }
    i += 1;
    if (arg === '--source') opts.source = path.resolve(value);
    else if (arg === '--template') opts.template = value;
    else if (arg === '--out') opts.out = path.resolve(value);
    else if (arg === '--font-size') opts.fontSize = value;
    else if (arg === '--columns') opts.columns = value;
    else if (arg === '--paper') opts.paper = value;
    else if (arg === '--margin') opts.margin = value;
    else if (arg === '--header-text') opts.headerText = value;
    else if (arg === '--auto-entry') opts.autoEntry = path.resolve(value);
    else if (arg === '--doc-wire-version') opts.docWireVersion = Number(value);
    else if (arg === '--view') opts.view = value;
    else if (arg === '--font-path') opts.fontPaths.push(path.resolve(value));
    else if (arg === '--doc-styles') opts.docStyles = path.resolve(value);
    else if (arg === '--auto-engine') {
      if (value !== 'legacy' && value !== 'ace') {
        throw Object.assign(new Error(`--auto-engine must be legacy|ace, got ${value}`), { code: 'E_ARGS' });
      }
      opts.autoEngine = value;
    }
  }
  return opts;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function fail(error) {
  const payload = {
    ok: false,
    error: {
      code: error.code ?? 'E_UNKNOWN',
      message: error.message,
      details: error.details ?? null,
    },
  };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(1);
}

// PLAN-083：Auto 入口不经 file 模块读写（本机 VM 缺陷：入口 use file 时部分被调函数
// 被错误编译）。输入经环境变量（PLAN083_*）传入，输出打印到 stdout 由宿主捕获。
// PLAN-084：执行端显式选择（§2.1/AC-08）。当前 auto 构建的脚本面默认已是 ACE sys
// 车道（该车道不支持本原型的 record/str 方法形态，见 PLAN-084 §7 T-00 矩阵）；
// 出版接口默认显式选择**已验旧版 VM 车道**（AUTO_ACE_CANDIDATE=0），
// `--auto-engine ace` 改用构建默认车道（当前为 ACE sys；AV/A2R 缺口与复验
// 条件见 PLAN-084 §7）。
function runAuto(entry, runDir, inputs, engine) {
  const autoCmd = process.env.PLAN082_AUTO || 'auto';
  // ace = 当前构建的默认脚本车道（ACE sys）：显式置 1，抵消外层可能的回退钮环境
  const engineEnv = engine === 'ace' ? { AUTO_ACE_CANDIDATE: '1', AUTO_ACE_SCRIPT_SYS: '1' } : { AUTO_ACE_CANDIDATE: '0' };
  const started = Date.now();
  const result = spawnSync(autoCmd, [entry], {
    cwd: PROTO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...engineEnv,
      PLAN083_WIRE: inputs.wire,
      PLAN083_REQUEST: inputs.request,
      PLAN083_STYLES: inputs.stylesWire,
    },
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    command: `${autoCmd} ${entry}`,
    engine,
    code: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ms: Date.now() - started,
    error: result.error ? String(result.error.message ?? result.error) : null,
  };
}

function autoVersion() {
  const autoCmd = process.env.PLAN082_AUTO || 'auto';
  const result = spawnSync(autoCmd, ['--version'], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  mkdirSync(opts.out, { recursive: true });

  const report = {
    schema_version: 'plan082-run-report-v1',
    tool: { auto: autoVersion(), auto_engine: opts.autoEngine, typst: null, node: process.version, platform: process.platform },
    request: {
      source: path.relative(REPO_ROOT, opts.source),
      template: opts.template,
      params: {
        font_size: opts.fontSize ?? null,
        columns: opts.columns ?? null,
        paper: opts.paper ?? null,
        margin: opts.margin ?? null,
        header_text: opts.headerText ?? null,
      },
      doc_wire_version: opts.docWireVersion,
    },
    stages: {},
    outputs: {},
    diagnostics: [],
    ok: false,
  };

  // 1. 解析正文（现有 engine parser）
  const t0 = Date.now();
  const doc = await parseSource(opts.source);
  report.stages.parse = { ms: Date.now() - t0, blocks: doc.blocks.length, diagnostics: doc.diagnostics.length };
  report.diagnostics.push(...doc.diagnostics);

  // 2. 编码 doc-wire + request（v2 默认；v1 仍可用——082 样例兼容）
  const wire = encodeDocWire(doc, { version: opts.docWireVersion });
  const request = encodeRequest({
    template: opts.template,
    view: opts.view,
    font_size: opts.fontSize,
    columns: opts.columns,
    paper: opts.paper,
    margin: opts.margin,
    header_text: opts.headerText ?? '',
  });
  let stylesWire = 'STYLEWIRE 1\nend\n';
  if (opts.docStyles) {
    const raw = JSON.parse(readFileSync(opts.docStyles, 'utf8'));
    stylesWire = encodeStylesWire(raw);
  }
  writeFileSync(path.join(opts.out, 'doc.wire'), wire);
  writeFileSync(path.join(opts.out, 'request.txt'), request);
  writeFileSync(path.join(opts.out, 'styles.wire'), stylesWire);
  report.outputs.doc_wire = { path: 'doc.wire', sha256: sha256(wire), bytes: Buffer.byteLength(wire) };
  report.outputs.styles_wire = { path: 'styles.wire', sha256: sha256(stylesWire), bytes: Buffer.byteLength(stylesWire) };

  // 3. Auto 求值（模板投影 + 样式合成 + 呈现）；结果从 stdout 捕获
  //   （Auto 入口不经 file 模块读写——本机 VM 缺陷规避，见 templates/main.at 头注）
  const auto = runAuto(opts.autoEntry, opts.out, { wire, request, stylesWire }, opts.autoEngine);
  report.stages.auto = {
    ms: auto.ms,
    code: auto.code,
    command: auto.command,
    stdout_tail: auto.stdout.trim().split('\n').slice(-3).join('\n'),
  };
  if (auto.code !== 0) {
    throw Object.assign(
      new Error(
        `Auto execution failed (exit ${auto.code}): ${(auto.stderr || auto.stdout).trim().slice(-2000)}`,
      ),
      { code: 'E_AUTO_RUN', details: { entry: path.relative(REPO_ROOT, opts.autoEntry), exit: auto.code } },
    );
  }
  const jsonLine = auto.stdout
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('{') && l.endsWith('}'));
  if (!jsonLine) {
    throw Object.assign(new Error('Auto run printed no JSON envelope to stdout'), {
      code: 'E_IR_MISSING',
    });
  }
  const publicationPath = path.join(opts.out, 'publication.json');
  const rawText = jsonLine + '\n';
  writeFileSync(publicationPath, rawText);

  // 4. 校验 IR 信封
  writeFileSync(path.join(opts.out, 'publication.raw.json'), rawText);
  let envelope;
  try {
    envelope = JSON.parse(rawText);
  } catch (err) {
    throw Object.assign(new Error(`Auto produced invalid JSON: ${err.message}`), {
      code: 'E_IR_PARSE',
      details: { raw: rawText.slice(0, 400) },
    });
  }
  if (envelope.ok !== true) {
    throw Object.assign(new Error(envelope.error?.message ?? 'Auto reported a template error'), {
      code: envelope.error?.code ?? 'E_TEMPLATE',
      details: { from: 'auto templates/main.at' },
    });
  }
  const publication = validatePublication(envelope.publication);
  const pretty = JSON.stringify(publication, null, 2) + '\n';
  writeFileSync(path.join(opts.out, 'publication.json'), pretty);
  report.outputs.publication_ir = {
    path: 'publication.json',
    sha256: sha256(pretty),
    blocks: publication.content.length,
    schema_version: publication.schema_version,
  };

  // 5. 资源解析（PLAN-084 T-03）：图片按 IR 清单从正文目录拷入输出目录；
  //    缺失/越界路径给可见诊断（非法路径不拷贝；缺失不静默——Typst 编译会如实失败）
  const sourceDir = path.dirname(opts.source);
  const outResolved = path.resolve(opts.out);
  const images = [];
  const seenSrc = new Set();
  for (const block of publication.content) {
    if (block.kind !== 'figure' || seenSrc.has(block.src)) continue;
    seenSrc.add(block.src);
    const absSrc = path.resolve(sourceDir, block.src);
    if (block.src.includes('..')) {
      report.diagnostics.push({
        code: 'W_RESOURCE_PATH_ILLEGAL',
        detail: `figure source path escapes the output root and was not copied: ${block.src}`,
      });
      images.push({ src: block.src, sha256: null, bytes: null, copied: false, reason: 'illegal-path' });
      continue;
    }
    const dest = path.join(outResolved, block.src);
    if (!existsSync(absSrc)) {
      report.diagnostics.push({
        code: 'W_RESOURCE_MISSING',
        detail: `figure source not found (Typst compile will report it): ${block.src}`,
      });
      images.push({ src: block.src, sha256: null, bytes: null, copied: false, reason: 'missing' });
      continue;
    }
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(absSrc, dest);
    const buf = readFileSync(dest);
    images.push({ src: block.src, sha256: sha256(buf), bytes: buf.length, copied: true });
  }

  // 6. Typst 发射 + 来源映射
  const emitted = emitTypst(publication);
  const faultLine = opts.injectTypstError
    ? '\n// PLAN-082 fault injection: 验证 E_TYPST_COMPILE 的真实失败映射（非正常用例）\n#panic("PLAN-082 injected typst failure")\n'
    : '';
  const typSource = emitted.typ + faultLine;
  writeFileSync(path.join(opts.out, 'publication.typ'), typSource);
  writeFileSync(path.join(opts.out, 'publication.map.json'), JSON.stringify(emitted.sourceMap, null, 2) + '\n');
  report.outputs.typst_source = {
    path: 'publication.typ',
    sha256: sha256(typSource),
    lines: typSource.split('\n').length - 1,
  };
  if (opts.injectTypstError) report.diagnostics.push({ code: 'I_FAULT_INJECTION', detail: 'typst compile error injected' });
  report.outputs.source_map = { path: 'publication.map.json', blocks: emitted.sourceMap.blocks.length };
  report.applied_config = emitted.config;
  // PLAN-083：后端能力诊断（不支持的属性显式报告，不静默丢弃）+ inspect_style 数据接口
  const backendDiags = emitted.backendDiags ?? backendCapabilityDiagnostics(publication);
  report.diagnostics.push(...backendDiags.map((d) => ({ code: d.code, detail: `${d.occurrence}: ${d.prop} = ${JSON.stringify(d.value)} (${d.detail})` })));
  const inspect = buildStyleInspect(publication, backendDiags);
  writeFileSync(path.join(opts.out, 'style-inspect.json'), JSON.stringify(inspect, null, 2) + '\n');
  report.outputs.style_inspect = { path: 'style-inspect.json', occurrences: inspect.occurrences.length, unsupported: backendDiags.length };

  // 7. Typst 编译 PDF
  const typstBin = locateTypst(PROTO_ROOT);
  if (!typstBin) {
    throw Object.assign(
      new Error(
        `Typst CLI ${PINNED_TYPST_VERSION} not found. Prepare it with: node scripts/fetch-typst.mjs ` +
          '(or set PLAN082_TYPST to an existing typst binary). .typ was generated but is not a PDF closure.',
      ),
      { code: 'E_TYPST_NOT_FOUND', details: { expected: `tools/typst-${PINNED_TYPST_VERSION}` } },
    );
  }
  report.tool.typst = typstVersion(typstBin);
  report.tool.typst_path = typstBin;

  // 8. 资源清单（PLAN-084 T-03：模板/引擎版本、字体集合、图片内容哈希；预览/导出复用同一清单）
  //    字体诊断：请求的字族不在 typst 可用清单 → W_FONT_MISSING（可见；Typst 自行回退渲染）
  const availableFonts = typstFonts(typstBin, opts.fontPaths);
  const fontCheck = (publication.page.font_family ?? []).map((family) => ({
    family,
    available: availableFonts === null ? null : availableFonts.some((f) => f === family),
  }));
  for (const f of fontCheck) {
    if (f.available === false) {
      report.diagnostics.push({
        code: 'W_FONT_MISSING',
        detail: `requested font family is not in the typst font list; typst will substitute: ${f.family}`,
      });
    }
  }
  const sourceBytes = readFileSync(opts.source);
  const resourceManifest = {
    schema_version: 'resource-manifest-v1',
    tool: {
      auto: report.tool.auto,
      auto_engine: opts.autoEngine,
      typst: report.tool.typst,
      node: process.version,
      platform: process.platform,
    },
    request: {
      template: publication.template,
      view: publication.view,
      source: path.relative(REPO_ROOT, opts.source),
      source_sha256: sha256(sourceBytes),
      doc_wire_version: opts.docWireVersion,
    },
    fonts: { requested: publication.page.font_family, available_checked: availableFonts !== null, missing: fontCheck.filter((f) => f.available === false).map((f) => f.family) },
    images,
    bibliography_entries: publication.content.filter((b) => b.kind === 'bib_entry').length,
    footnote_defs: publication.content.filter((b) => b.kind === 'footnote_def').length,
  };
  writeFileSync(path.join(opts.out, 'resource-manifest.json'), JSON.stringify(resourceManifest, null, 2) + '\n');
  report.outputs.resource_manifest = {
    path: 'resource-manifest.json',
    images: images.length,
    missing: resourceManifest.fonts.missing.length,
  };
  if (!opts.skipPdf) {
    const compile = typstCompile(typstBin, {
      input: path.join(opts.out, 'publication.typ'),
      output: path.join(opts.out, 'publication.pdf'),
      root: opts.out,
      fontPaths: opts.fontPaths,
    });
    report.stages.typst_compile = { ms: compile.ms, code: compile.code, stderr_tail: compile.stderr.trim().slice(-1200) };
    if (compile.code !== 0) {
      throw Object.assign(new Error(`Typst compile failed (exit ${compile.code}): ${compile.stderr.trim().slice(-1500)}`), {
        code: 'E_TYPST_COMPILE',
        details: { stderr: compile.stderr.trim().slice(-4000) },
      });
    }
    const pdf = readFileSync(path.join(opts.out, 'publication.pdf'));
    report.outputs.pdf = { path: 'publication.pdf', sha256: sha256(pdf), bytes: pdf.length };

    const query = typstQuery(typstBin, {
      input: path.join(opts.out, 'publication.typ'),
      selector: '<plan082-config>',
      root: opts.out,
    });
    report.stages.typst_query = { ms: query.ms, code: query.code };
    if (query.code === 0) {
      try {
        report.typst_config = JSON.parse(query.stdout)[0]?.value ?? null;
      } catch {
        report.diagnostics.push({ code: 'W_TYPST_QUERY_PARSE', detail: query.stdout.slice(0, 200) });
      }
    } else {
      report.diagnostics.push({ code: 'W_TYPST_QUERY_FAILED', detail: query.stderr.slice(0, 400) });
    }
  }

  report.ok = true;
  report.timings_ms = {
    parse: report.stages.parse.ms,
    auto: report.stages.auto.ms,
    typst_compile: report.stages.typst_compile?.ms ?? 0,
    total: Object.values(report.stages).reduce((sum, stage) => sum + (stage.ms ?? 0), 0),
  };
  writeFileSync(path.join(opts.out, 'run-report.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(`${JSON.stringify({ ok: true, out: opts.out, report: report.timings_ms, applied: report.applied_config }, null, 2)}\n`);
}

main().catch(fail);
