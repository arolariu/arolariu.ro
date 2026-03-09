# This script will start the docker containers that are needed for the selfhost project.

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
curl -sf -X POST http://localhost:8081/dbs/primary/colls -H "Content-Type: application/json" -d '{"id":"invoices","partitionKey":{"paths":["/id"],"kind":"Hash"}}' > /dev/null 2>&1 || true
echo "✅ CosmosDB database 'primary' and container 'invoices' initialized."

# Creating the Azurite blob containers...
echo "📦 Initializing Azurite blob containers..."
node -e "
const { BlobServiceClient } = require('@azure/storage-blob');
const c = BlobServiceClient.fromConnectionString('DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1;');
Promise.all(['invoices'].map(n => c.getContainerClient(n).createIfNotExists().then(r => console.log(n + ':', r.succeeded ? 'created' : 'exists')))).catch(e => console.error(e.message));
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
