# This script will start the docker containers that are needed for the selfhost project.

# ── HTTPS: ensure mkcert certificates exist ──────────────────────────────
CERT_DIR="Management/certs"
CERT_FILE="$CERT_DIR/local-cert.pem"
KEY_FILE="$CERT_DIR/local-key.pem"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "🔐 Setting up local HTTPS certificates..."

  # Install mkcert if not present
  if ! command -v mkcert >/dev/null 2>&1; then
    echo "   mkcert not found — attempting install..."
    if command -v brew >/dev/null 2>&1; then
      brew install mkcert 2>/dev/null
    elif command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update -qq && sudo apt-get install -y -qq mkcert libnss3-tools 2>/dev/null
    elif command -v pacman >/dev/null 2>&1; then
      sudo pacman -Sy --noconfirm mkcert nss 2>/dev/null
    fi
  fi

  if command -v mkcert >/dev/null 2>&1; then
    mkcert -install 2>/dev/null
    mkdir -p "$CERT_DIR"
    mkcert -key-file "$KEY_FILE" -cert-file "$CERT_FILE" "localhost" "*.localhost"
    echo "✅ HTTPS certificates generated in $CERT_DIR"
  else
    echo "⚠️  mkcert not available — HTTPS will use Traefik's default self-signed cert."
    echo "   Install mkcert manually: https://github.com/FiloSottile/mkcert#installation"
  fi
else
  echo "✅ HTTPS certificates already exist in $CERT_DIR"
fi

# Start the Management containers
echo "📦 Preparing to start the management containers..."
docker compose -f Management/docker-compose.yml up -d

sleep 3

# Start the Storage containers
echo "📦 Preparing to start the storage containers..."
docker compose -f Storage/docker-compose.yml up -d

# Wait 10 seconds for the servers to start and become ready
echo "🕒 Waiting for the servers to start..."
sleep 10

# Creating the 'arolariu-sql' SQL database...
echo "📦 Running the setup script for SQL..."
docker exec -it mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -d master -i /usr/sql/sqlSchema.sql -No

# Creating the CosmosDB database and container...
echo "📦 Initializing CosmosDB emulator database..."
curl -sf -X POST http://localhost:8081/dbs -H "Content-Type: application/json" -d '{"id":"primary"}' > /dev/null 2>&1 || true
curl -sf -X POST http://localhost:8081/dbs/primary/colls -H "Content-Type: application/json" -d '{"id":"invoices","partitionKey":{"paths":["/UserIdentifier"],"kind":"Hash"}}' > /dev/null 2>&1 || true
curl -sf -X POST http://localhost:8081/dbs/primary/colls -H "Content-Type: application/json" -d '{"id":"merchants","partitionKey":{"paths":["/parentCompanyId"],"kind":"Hash"}}' > /dev/null 2>&1 || true
echo "✅ CosmosDB database 'primary' with containers 'invoices' and 'merchants' initialized."

# Creating the Azurite blob containers...
echo "📦 Initializing Azurite blob containers..."
node -e "
const { BlobServiceClient } = require('@azure/storage-blob');
const c = BlobServiceClient.fromConnectionString('DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1;');
Promise.all(['invoices'].map(async n => {
  const cc = c.getContainerClient(n);
  const r = await cc.createIfNotExists();
  await cc.setAccessPolicy('blob');
  console.log(n + ':', r.succeeded ? 'created (public)' : 'exists (public)');
})).then(() => c.setProperties({ cors: [{ allowedOrigins: '*', allowedMethods: 'GET,HEAD,OPTIONS', allowedHeaders: '*', exposedHeaders: '*', maxAgeInSeconds: 3600 }] })).then(() => console.log('CORS enabled')).catch(e => console.error(e.message));
"
echo "✅ Azurite blob containers initialized."

sleep 3

# Start the Backend containers
echo "📦 Preparing to start the backend containers..."
docker compose -f Backend/docker-compose.yml up -d

sleep 3

# Start the Frontend containers
echo "📦 Preparing to start the frontend containers..."
docker compose -f Frontend/docker-compose.yml up -d
