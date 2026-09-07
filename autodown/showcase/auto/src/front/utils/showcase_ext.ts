// showcase_ext.ts — hand-written TS extension for the showcase root widget
// (../showcase.at, PLAN-059; demo app_ext.ts precedent plan 014 Phase 0).
// Imported via `use { fn: ... }`; the Auto build copies it into the gen
// project as src/ext/src/front/utils/showcase_ext.ts, and the generated
// App.vue (deployed to showcase/src/ by gen/regen.sh) imports it from
// ./auto/src/front/utils/showcase_ext.
//
// What lives here per task:
// - initial_content — reads the sample.ts single source (demo content.ts
//   precedent, plan 040 单源化); the VM track resolves the same port name
//   to the GENERATED showcase_ext.vm.at adapter instead.
// - is_vue — the track probe (demo precedent, plan 040): vue track returns
//   true; VM track degrades to the ext no-op stub returning None, so
//   `if is_vue() != None` discriminates on both tracks. Guards every
//   vue-only bridge write (VM state has no template-ref fields).
// - log_ready — init console marker (the demo logSave/logCancel slot).

import { SAMPLE_DOCUMENT } from '../../../../src/sample'

export function initial_content(): string {
  return SAMPLE_DOCUMENT
}

export function is_vue(): boolean {
  return true
}

export function log_ready(msg: string) {
  console.log('showcase:', msg)
}
