#!/usr/bin/env bash
# gen-support.sh — PLAN-076 worktree gen-tree support redeploy (README gap-32
# + G-7 flow, 073/074 convention): after every `auto build` regen (which
# wipes the manual mirror), redeploy the stubs + src/src mirror, then run the
# gen typecheck gate. Usage: bash gen-support.sh
set -e
cd "$(dirname "$0")"
G=gen/front/vue
mkdir -p $G/src/src/lib $G/src/src/stores $G/src/types
# stubs: api both levels + lib mirrors + store facade stubs + type decls
cp stubs/gen_lib_api.ts $G/src/lib/api.ts
cp stubs/gen_lib_api.ts $G/src/src/lib/api.ts
cp stubs/gen_lib_dailyNote.ts $G/src/lib/dailyNote.ts
cp stubs/gen_lib_dailyNote.ts $G/src/src/lib/dailyNote.ts
cp stubs/gen_lib_wikiLink.ts $G/src/lib/wikiLink.ts
cp stubs/gen_lib_wikiLink.ts $G/src/src/lib/wikiLink.ts
cp stubs/gen_lib_templates.ts $G/src/lib/templates.ts
cp stubs/gen_lib_templates.ts $G/src/src/lib/templates.ts
cp stubs/gen_stores/*.ts $G/src/src/stores/
cp stubs/gen_cytoscape_fcose.d.ts $G/src/types/cytoscape-fcose.d.ts
cp stubs/gen_autodown_editor.d.ts $G/src/types/autodown-editor.d.ts
# G-7: PLAN-646 overlay support files (compiler appends the import, not these)
[ -f $G/src/vite-env.d.ts ] || printf '/// <reference types="vite/client" />\n' > $G/src/vite-env.d.ts
[ -f $G/src/auto-sources.ts ] || printf '// PLAN-646 Select-Anything source registry (gitignored env support file, G-7).\nexport const AUTO_SOURCES: Record<string, string> = {}\n' > $G/src/auto-sources.ts
# src/src mirror: generated components/composables + stub stores
cp -r $G/src/components $G/src/src/
cp -r $G/src/stores $G/src/src/
cp stubs/gen_stores/*.ts $G/src/src/stores/
echo "[gen-support] mirror + stubs redeployed; running gen typecheck gate"
cd $G && pnpm run build
