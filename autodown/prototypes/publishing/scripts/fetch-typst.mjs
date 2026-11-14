#!/usr/bin/env node
// PLAN-082 — 准备固定版本 Typst CLI（0.15.1）。
//
// 两条可复现路径，优先下载官方 release（带 sha256 校验），下载不可用时退回 cargo install：
//   1) node scripts/fetch-typst.mjs
//   2) 或手动： cargo install typst-cli --version 0.15.1 --locked --root <prototype>/tools/cargo-typst
// 产物落在 <prototype>/tools/typst-0.15.1/typst.exe，publish.mjs 默认从这里查找。

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.15.1';
const ASSET = 'typst-x86_64-pc-windows-msvc.zip';
const URL = `https://github.com/typst/typst/releases/download/v${VERSION}/${ASSET}`;
const SHA256 = '19ce3551153c2fe7ee9fa2f95208310c8f4d3209fedb699e0333faf8913f6736';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(HERE, '..');
const TARGET_DIR = path.join(PROTO, 'tools', `typst-${VERSION}`);
const TARGET = path.join(TARGET_DIR, process.platform === 'win32' ? 'typst.exe' : 'typst');

function report() {
  const result = spawnSync(TARGET, ['--version'], { encoding: 'utf8' });
  if (result.status === 0) {
    console.log(`[fetch-typst] ${TARGET} -> ${result.stdout.trim()}`);
    return true;
  }
  return false;
}

function download() {
  mkdirSync(TARGET_DIR, { recursive: true });
  const zip = path.join(PROTO, 'tools', ASSET);
  console.log(`[fetch-typst] downloading ${URL}`);
  if (process.platform === 'win32') {
    const ps = spawnSync(
      'pwsh',
      ['-NoProfile', '-Command', `Invoke-WebRequest -Uri '${URL}' -OutFile '${zip}' -UseBasicParsing`],
      { encoding: 'utf8' },
    );
    if (ps.status !== 0) {
      console.error(ps.stderr?.slice(-800));
      return false;
    }
  } else {
    const curl = spawnSync('curl', ['-L', '--retry', '3', '-o', zip, URL], { encoding: 'utf8' });
    if (curl.status !== 0) {
      console.error(curl.stderr?.slice(-800));
      return false;
    }
  }
  const digest = createHash('sha256').update(readFileSync(zip)).digest('hex');
  if (digest !== SHA256) {
    console.error(`[fetch-typst] sha256 mismatch: got ${digest}, want ${SHA256}`);
    rmSync(zip, { force: true });
    return false;
  }
  const unpack = spawnSync('tar', ['-xf', zip, '-C', TARGET_DIR], { encoding: 'utf8' });
  if (unpack.status !== 0) {
    console.error(unpack.stderr?.slice(-800));
    return false;
  }
  // release zip 内层目录名带目标三元组，扁平化到 tools/typst-<version>/
  const inner = path.join(TARGET_DIR, `typst-x86_64-pc-windows-msvc`, 'typst.exe');
  if (existsSync(inner)) copyFileSync(inner, TARGET);
  rmSync(zip, { force: true });
  return existsSync(TARGET);
}

function cargoInstall() {
  const root = path.join(PROTO, 'tools', 'cargo-typst');
  console.log('[fetch-typst] falling back to: cargo install typst-cli --version ' + VERSION + ' --locked');
  const result = spawnSync(
    'cargo',
    ['install', 'typst-cli', '--version', VERSION, '--locked', '--root', root],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) return false;
  const bin = path.join(root, 'bin', process.platform === 'win32' ? 'typst.exe' : 'typst');
  if (!existsSync(bin)) return false;
  mkdirSync(TARGET_DIR, { recursive: true });
  copyFileSync(bin, TARGET);
  return existsSync(TARGET);
}

function main() {
  if (existsSync(TARGET) && report()) {
    console.log('[fetch-typst] already prepared');
    return;
  }
  const ok = download() ? report() : false;
  if (ok) return;
  console.log('[fetch-typst] release download unavailable, trying cargo');
  if (cargoInstall() && report()) return;
  console.error(
    `[fetch-typst] failed. Prepare manually:\n  cargo install typst-cli --version ${VERSION} --locked --root ${path.join(
      PROTO,
      'tools',
      'cargo-typst',
    )}\n  then copy tools/cargo-typst/bin/typst(.exe) to ${TARGET}\n  or set PLAN082_TYPST to an existing typst binary.`,
  );
  process.exit(1);
}

main();
