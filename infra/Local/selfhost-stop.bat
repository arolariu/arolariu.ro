@echo off
rem This script will stop the docker containers that were started by the selfhost-start.bat script.

rem Stop the Frontend containers
echo 📦 Preparing to stop the frontend containers...
docker compose -f Frontend/docker-compose.yml down

timeout /t 2 /nobreak > nul

rem Stop the Backend containers
echo 📦 Preparing to stop the backend containers...
docker compose -f Backend/docker-compose.yml down

timeout /t 2 /nobreak > nul

rem Stop the Storage containers
echo 📦 Preparing to stop the storage containers...
docker compose -f Storage/docker-compose.yml down

timeout /t 2 /nobreak > nul

rem Stop the Management containers
echo 📦 Preparing to stop the management containers...
docker compose -f Management/docker-compose.yml down

echo ✅ All containers have been stopped!
