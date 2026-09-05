@echo off
rem PLAN-053 T6/T12: detached VM window for probe/vm-smoke (port 9263; 9247
rem is squatted by a musk process on this machine). Exe = the plan-local
rem target build of the auto-lang dependency worktree (fix under test).
rem P053_TRACE = fix instrumentation (theme epoch + stream/family_of path).
set AUTOUI_MCP_PORT=9263
set AUTOUI_ACCEPTANCE=1
set P053_TRACE=1
cd /d D:\autostack\.wt\auto-down-053\auto-down\autodown\demo\auto
start "vm-053" cmd /c "D:\autostack\.wt\auto-down-053\auto-target\debug\auto.exe run -r vm > vm-053.log 2>&1"
