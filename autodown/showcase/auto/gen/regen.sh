#!/bin/bash
# Full regen + deploy for the showcase app Auto sources (PLAN-059; demo
# auto/gen/regen.sh contract, plan 014). Lives in gitignored gen/.
# Usage: bash gen/regen.sh
# Gates: any "Warning: Failed to compile" (stale-SFC trap) or gen vue-tsc
# error aborts BEFORE deploy — no silent stale deploys.
set -e
set -o pipefail
cd "$(dirname "$0")/.."
AUTO=${AUTO:-D:/autostack/auto-lang/target/debug/auto.exe}

# --- Gen-project mirrors (double-src shims; jade gap 32) ---
# showcase_ext.ts's ../../../../src/... imports resolve to
# gen/front/vue/src/src/... in the gen tree. Delete-then-copy: cp -r nests
# when the target exists (jade gap 50).
rm -rf gen/front/vue/src/src
mkdir -p gen/front/vue/src/src
cp ../src/sample.ts gen/front/vue/src/src/sample.ts

"$AUTO" build -d . 2>&1 | tee gen/build.log
if grep -q "Failed to compile" gen/build.log; then
  # covers both the stale-SFC trap ("Warning: Failed to compile") and hard
  # parse errors ("Error: × Failed to compile app.at") — T6 hole found: a
  # bare parse error exited 0 through the old warning-only grep + tee pipe.
  echo "!!! BUILD FAILED TO COMPILE — aborting deploy" >&2
  exit 1
fi
if grep -q "error TS" gen/build.log; then
  echo "!!! GEN VUE-TSC ERRORS — aborting deploy" >&2
  exit 1
fi

# --- Deploy: rewrite the gen-only aliases to showcase-relative paths ---
sed -e 's|@/ext/src/front/utils/showcase_ext|../auto/src/front/utils/showcase_ext|g' \
  gen/front/vue/src/App.vue > ../src/App.vue
# PLAN-059 T7: settings 弹层组件（自包含无 @/ 别名 import，直接拷贝）。
mkdir -p ../src/components
cp gen/front/vue/src/components/SettingsPopover.vue ../src/components/SettingsPopover.vue

echo "REGEN OK"
