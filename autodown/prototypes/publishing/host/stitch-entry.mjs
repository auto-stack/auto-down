// PLAN-084 T-00 — 执行端适配：把模板模块缝合成单文件薄入口
//
// 背景（2026-11-22 实测，见 PLAN-084 §2.1/§7）：
//   * 旧版 VM（AUTO_ACE_CANDIDATE=0）支持 `use mod: item` 多模块入口（082/083 已验路径）；
//   * 新版 A2R 的 scalar 前门接受同一语法但只吃单模块——`use ir: ...` 的跨模块引用
//     无法解析；把五个库模块按依赖顺序缝合为一个文件（剥掉 use 行）后，同一模板
//     逻辑可在 A2R 上真实编译执行。入口函数改为带类型签名并经 env 通道读取
//     PLAN083_WIRE/REQUEST/STYLES（与旧路径同一份输入文件）。
//   * 缝合是机械变换：不重排/不改写任何函数体，仅删除 use 行并追加新薄入口。
//
// 用法：node host/stitch-entry.mjs --mode a2r --out <entry.at>

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = path.resolve(HERE, '../templates');

// 依赖顺序：style（无依赖）→ ir（use style）→ academic/office_book（use ir/style）
// → render（use 全部）。剥掉 use 行后同名符号已在同文件更早定义。
const MODULE_ORDER = ['style.at', 'ir.at', 'academic.at', 'office_book.at', 'render.at'];

function stripUseLines(source) {
  return source
    .split('\n')
    .filter((line) => !/^use\s/.test(line))
    .join('\n');
}

function stitchModules() {
  const parts = [];
  parts.push('// [stitched] PLAN-084 — publication templates, single-file bundle for engine adapters');
  parts.push('// 同一模板逻辑：style → ir → academic → office_book → render（use 行机械剥除）');
  for (const name of MODULE_ORDER) {
    const source = readFileSync(path.join(TEMPLATES, name), 'utf8');
    parts.push(`\n// ── module: ${name} ────────────────────────────────────────────\n`);
    parts.push(stripUseLines(source).trimEnd());
  }
  return parts.join('\n');
}

// 薄入口（A2R）：带类型签名；错误路径显式 return 非零；成功打印 IR 信封后 return 0。
function a2rEntry() {
  return `
// ── thin entry (a2r): same contract as templates/main.at, typed signatures ──
use env: get

fn main() int {
    let wire = get("PLAN083_WIRE")
    let request = get("PLAN083_REQUEST")
    let styles_wire = get("PLAN083_STYLES")
    let parsed_options = parse_options(request)
    if parsed_options.ok == 0 {
        print(json_error(parsed_options.code, parsed_options.message))
        return 1
    }
    let parsed_doc = parse_doc(wire)
    if parsed_doc.ok == 0 {
        print(json_error(parsed_doc.code, parsed_doc.message))
        return 1
    }
    let opts = parsed_options.options
    if opts.template == "office_book" {
        if opts.columns_explicit == 1 && opts.columns != 1 {
            print(
                json_error(
                    "E_OPTION_UNSUPPORTED",
                    "office_book fixes a single-column body; --columns " + opts.columns.to(str) + " is not supported"
                )
            )
            return 1
        }
    }
    let fin = build_and_finalize(opts.template, parsed_doc.doc, opts, styles_wire)
    if fin.ok == 0 {
        print(json_error(fin.code, fin.message))
        return 1
    }
    print(json_publication(fin.result))
    return 0
}
`;
}

function parseArgs(argv) {
  const opts = { mode: 'a2r', out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--mode') opts.mode = argv[++i];
    else if (argv[i] === '--out') opts.out = path.resolve(argv[++i]);
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!opts.out) throw new Error('--out is required');
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.mode !== 'a2r') {
    throw new Error(`unsupported stitch mode: ${opts.mode} (a2r only; AV script lanes lack record declarations — see PLAN-084 §7)`);
  }
  const bundle = stitchModules() + '\n' + a2rEntry();
  mkdirSync(path.dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, bundle);
  process.stdout.write(
    JSON.stringify({
      ok: true,
      out: opts.out,
      mode: opts.mode,
      modules: MODULE_ORDER,
      bytes: Buffer.byteLength(bundle),
      lines: bundle.split('\n').length,
    }) + '\n',
  );
}

main();
