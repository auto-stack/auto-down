// PLAN-082 — Typst CLI 定位 / 版本 / 编译 / 查询（固定版本由 scripts/fetch-typst.mjs 准备）
//
// 查找顺序：$PLAN082_TYPST → <prototype>/tools/typst-<pinned>/typst.exe → PATH 中的 typst → typst.exe
// 找不到时返回 E_TYPST_NOT_FOUND（含准备命令），不把“只生成 .typ”当成 PDF 闭环成功。

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const PINNED_TYPST_VERSION = '0.15.1';

export function prototypeRoot(hostDir) {
  return path.resolve(hostDir, '..');
}

export function locateTypst(protoRoot) {
  const candidates = [];
  if (process.env.PLAN082_TYPST) candidates.push(process.env.PLAN082_TYPST);
  const bin = process.platform === 'win32' ? 'typst.exe' : 'typst';
  candidates.push(path.join(protoRoot, 'tools', `typst-${PINNED_TYPST_VERSION}`, bin));
  candidates.push(bin);
  for (const candidate of candidates) {
    if (candidate === bin || existsSync(candidate)) return candidate;
  }
  return null;
}

function runTypst(bin, args, options = {}) {
  const started = Date.now();
  const result = spawnSync(bin, args, {
    encoding: 'utf8',
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    code: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    ms: Date.now() - started,
    error: result.error ? String(result.error.message ?? result.error) : null,
  };
}

export function typstVersion(bin) {
  const result = runTypst(bin, ['--version']);
  if (result.code !== 0) {
    throw Object.assign(new Error(`typst --version failed: ${result.stderr || result.error}`), {
      code: 'E_TYPST_NOT_FOUND',
    });
  }
  return result.stdout.trim();
}

export function typstCompile(bin, { input, output, root, fontPaths, ignoreSystemFonts }) {
  const args = ['compile', '--root', root];
  for (const fontPath of fontPaths ?? []) args.push('--font-path', fontPath);
  if (ignoreSystemFonts) args.push('--ignore-system-fonts');
  args.push(input, output);
  return runTypst(bin, args);
}

export function typstQuery(bin, { input, selector, root, field }) {
  const args = ['query', '--root', root, '--format', 'json'];
  if (field) args.push('--field', field);
  args.push(input, selector);
  return runTypst(bin, args);
}

// PLAN-084：可用字体清单（资源清单/缺字诊断用）。失败返回 null（不阻塞出版）。
export function typstFonts(bin, fontPaths) {
  const args = ['fonts'];
  for (const fontPath of fontPaths ?? []) args.push('--font-path', fontPath);
  const result = runTypst(bin, args);
  if (result.code !== 0) return null;
  return result.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
