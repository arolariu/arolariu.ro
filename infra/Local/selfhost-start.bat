@echo off
setlocal
pushd "%~dp0..\.."
node scripts/cli.ts dev selfhost start %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
