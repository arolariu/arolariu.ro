@echo off
setlocal
pushd "%~dp0..\.."
node scripts/dev-selfhost.mjs stop %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
