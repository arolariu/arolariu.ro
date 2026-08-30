@echo off
setlocal
pushd "%~dp0..\.."
node scripts/container-runtime/selfhost.ts stop %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
