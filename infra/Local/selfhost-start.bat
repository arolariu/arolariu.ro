@echo off
rem This script will start the docker containers that are needed for the selfhost project.

rem Start the Management containers
echo 📦 Preparing to start the management containers...
docker compose -f Management/docker-compose.yml up -d

timeout /t 3 /nobreak > nul

rem Start the Storage containers
echo 📦 Preparing to start the storage containers...
docker compose -f Storage/docker-compose.yml up -d

rem Wait 10 seconds for the servers to start and become ready
echo 🕒 Waiting for the servers to start...
timeout /t 10 /nobreak > nul

rem Creating the 'arolariu-sql' SQL database...
echo 📦 Running the setup script for SQL...
docker exec -i mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P qazWSXedcRFV1234! -d master -i /usr/sql/sqlSchema.sql -No

timeout /t 3 /nobreak > nul

rem Start the Backend containers
echo 📦 Preparing to start the backend containers...
docker compose -f Backend/docker-compose.yml up -d

timeout /t 3 /nobreak > nul

rem Start the Frontend containers
echo 📦 Preparing to start the frontend containers...
docker compose -f Frontend/docker-compose.yml up -d

echo ✅ All containers have been started!
