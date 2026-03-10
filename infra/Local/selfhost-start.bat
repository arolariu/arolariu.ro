@echo off
rem This script will start the docker containers that are needed for the selfhost project.
rem Windows equivalent of selfhost-start.sh — keeps both scripts in sync.

rem ── HTTPS: ensure mkcert certificates exist ─────────────────────────────
set "CERT_DIR=Management\certs"
set "CERT_FILE=%CERT_DIR%\local-cert.pem"
set "KEY_FILE=%CERT_DIR%\local-key.pem"

if not exist "%CERT_FILE%" (
  echo 🔐 Setting up local HTTPS certificates...

  where mkcert >nul 2>nul
  if errorlevel 1 (
    echo    mkcert not found — attempting install via winget...
    winget install FiloSottile.mkcert --accept-package-agreements --accept-source-agreements >nul 2>nul
    rem Refresh PATH so mkcert is found in this session
    for /f "tokens=*" %%i in ('where mkcert 2^>nul') do set "MKCERT_PATH=%%i"
  )

  where mkcert >nul 2>nul
  if errorlevel 1 (
    echo ⚠️  mkcert not available — HTTPS will use Traefik's default self-signed cert.
    echo    Install mkcert manually: https://github.com/FiloSottile/mkcert#installation
    goto :start_containers
  )

  mkcert -install 2>nul
  if not exist "%CERT_DIR%" mkdir "%CERT_DIR%"
  mkcert -key-file "%KEY_FILE%" -cert-file "%CERT_FILE%" "localhost" "*.localhost"
  echo ✅ HTTPS certificates generated in %CERT_DIR%
) else (
  echo ✅ HTTPS certificates already exist in %CERT_DIR%
)

:start_containers

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
docker exec -i mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -P "qazWSXedcRFV1234!" -d master -i /usr/sql/sqlSchema.sql -No

rem Creating the CosmosDB database and containers...
echo 📦 Initializing CosmosDB emulator database...
curl -sf -X POST http://localhost:8081/dbs -H "Content-Type: application/json" -d "{\"id\":\"primary\"}" > nul 2>&1
curl -sf -X POST http://localhost:8081/dbs/primary/colls -H "Content-Type: application/json" -d "{\"id\":\"invoices\",\"partitionKey\":{\"paths\":[\"/UserIdentifier\"],\"kind\":\"Hash\"}}" > nul 2>&1
curl -sf -X POST http://localhost:8081/dbs/primary/colls -H "Content-Type: application/json" -d "{\"id\":\"merchants\",\"partitionKey\":{\"paths\":[\"/parentCompanyId\"],\"kind\":\"Hash\"}}" > nul 2>&1
echo ✅ CosmosDB database 'primary' with containers 'invoices' and 'merchants' initialized.

rem Creating the Azurite blob containers...
echo 📦 Initializing Azurite blob containers...
node -e "const{BlobServiceClient:B}=require('@azure/storage-blob');const c=B.fromConnectionString('DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1;');Promise.all(['invoices'].map(async n=>{const cc=c.getContainerClient(n);const r=await cc.createIfNotExists();await cc.setAccessPolicy('blob');console.log(n+':',r.succeeded?'created (public)':'exists (public)');})).then(()=>c.setProperties({cors:[{allowedOrigins:'*',allowedMethods:'GET,HEAD,OPTIONS',allowedHeaders:'*',exposedHeaders:'*',maxAgeInSeconds:3600}]})).then(()=>console.log('CORS enabled')).catch(e=>console.error(e.message));"
echo ✅ Azurite blob containers initialized.

timeout /t 3 /nobreak > nul

rem Start the Backend containers
echo 📦 Preparing to start the backend containers...
docker compose -f Backend/docker-compose.yml up -d

timeout /t 3 /nobreak > nul

rem Start the Frontend containers
echo 📦 Preparing to start the frontend containers...
docker compose -f Frontend/docker-compose.yml up -d

echo ✅ All containers have been started!
