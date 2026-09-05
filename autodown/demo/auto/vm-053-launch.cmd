@echo off
rem PLAN-053 T6: detached VM window for probe/vm-smoke (port 9263; 9247 is
rem squatted by a musk process on this machine right now).
set AUTOUI_MCP_PORT=9263
set AUTOUI_ACCEPTANCE=1
cd /d D:\autostack\.wt\auto-down-053\auto-down\autodown\demo\auto
start "vm-053" cmd /c "D:\autostack\auto-lang\target\debug\auto.exe run -r vm > vm-053.log 2>&1"
