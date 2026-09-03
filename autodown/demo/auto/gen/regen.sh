#!/bin/bash
# Full regen + deploy for the demo app Auto sources (plan 014). Lives in
# gitignored gen/. Usage: bash gen/regen.sh
# Gates: any "Warning: Failed to compile" (stale-SFC trap) or gen vue-tsc
# error aborts BEFORE deploy — no silent stale deploys.
set -e
cd "$(dirname "$0")/.."
AUTO=${AUTO:-D:/autostack/auto-lang/target/debug/auto.exe}

# --- Gen-project mirrors (double-src shims; see README) ---
# app_ext.ts's ../../../../src/... imports resolve to gen/front/vue/src/src/...
# in the gen tree (jade gap 32). Delete-then-copy: cp -r nests when the target
# exists (jade gap 50).
rm -rf gen/front/vue/src/src
mkdir -p gen/front/vue/src/src/composables
cp ../src/content.ts gen/front/vue/src/src/content.ts
cp ../src/composables/useSyncedScroll.ts gen/front/vue/src/src/composables/useSyncedScroll.ts
cp ../src/composables/useTableColumnResize.ts gen/front/vue/src/src/composables/useTableColumnResize.ts

"$AUTO" build -d . 2>&1 | tee gen/build.log
if grep -q "Warning: Failed to compile" gen/build.log; then
  echo "!!! BUILD HAD COMPILE WARNINGS — aborting deploy" >&2
  exit 1
fi
if grep -q "error TS" gen/build.log; then
  echo "!!! GEN VUE-TSC ERRORS — aborting deploy" >&2
  exit 1
fi

# --- Deploy: rewrite the gen-only aliases to demo-relative paths ---
sed -e 's|@/ext/src/front/utils/app_ext|../auto/src/front/utils/app_ext|g' \
    -e 's|@/components/CustomScrollbar.vue|./components/CustomScrollbar.vue|g' \
  gen/front/vue/src/App.vue > ../src/App.vue
sed 's|@/ext/src/front/utils/app_ext|../auto/src/front/utils/app_ext|g' \
  gen/front/vue/src/components/CustomScrollbar.vue > ../src/components/CustomScrollbar.vue

echo "REGEN OK"
