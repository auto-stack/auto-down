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
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSource, REPO_ROOT } from './doc-parse.mjs';
import { encodeDocWire, encodeRequest } from './wire.mjs';
import { emitTypst, validatePublication } from './emit-typst.mjs';
import { locateTypst, typstVersion, typstCompile, typstQuery, PINNED_TYPST_VERSION } from './typst.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTO_ROOT = path.resolve(HERE, '..');

function parseArgs(argv) {
  const opts = {
    source: path.join(PROTO_ROOT, 'samples/research.ad'),
    template: 'academic',
    out: path.join(PROTO_ROOT, 'out', 'academic'),
    autoEntry: path.join(PROTO_ROOT, 'templates/main.at'),
    docWireVersion: 1,
    skipPdf: false,
    fontPaths: [],
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
    else if (arg === '--font-path') opts.fontPaths.push(path.resolve(value));
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

function runAuto(entry, runDir) {
  const autoCmd = process.env.PLAN082_AUTO || 'auto';
  const started = Date.now();
  const result = spawnSync(autoCmd, [entry], {
    cwd: PROTO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, PLAN082_RUN_DIR: runDir },
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    command: `${autoCmd} ${entry}`,
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
    tool: { auto: autoVersion(), typst: null, node: process.version, platform: process.platform },
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

  // 2. 编码 doc-wire + request
  const wire = encodeDocWire(doc).replace('DOCWIRE 1', `DOCWIRE ${opts.docWireVersion}`);
  const request = encodeRequest({
    template: opts.template,
    font_size: opts.fontSize,
    columns: opts.columns,
    paper: opts.paper,
    margin: opts.margin,
    header_text: opts.headerText ?? '',
  });
  writeFileSync(path.join(opts.out, 'doc.wire'), wire);
  writeFileSync(path.join(opts.out, 'request.txt'), request);
  report.outputs.doc_wire = { path: 'doc.wire', sha256: sha256(wire), bytes: Buffer.byteLength(wire) };

  // 3. Auto 求值（模板投影）
  const auto = runAuto(opts.autoEntry, opts.out);
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
  const publicationPath = path.join(opts.out, 'publication.json');
  if (!existsSync(publicationPath)) {
    throw Object.assign(new Error(`Auto run produced no publication.json in ${opts.out}`), {
      code: 'E_IR_MISSING',
    });
  }

  // 4. 校验 IR 信封
  const rawText = readFileSync(publicationPath, 'utf8');
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

  // 5. Typst 发射 + 来源映射
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

  // 6. Typst 编译 PDF
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
