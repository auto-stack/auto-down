@echo off
set AUTOUI_MCP_PORT=9359
set AUTOUI_ACCEPTANCE=1
cd /d D:\autostack\.wt\auto-down-061\auto-down\autodown\demo\auto
start "vm-061" cmd /c "D:\autostack\auto-lang\target\debug\auto.exe run -r vm > vm-061.log 2>&1"
