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
docker exec -it mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P qazWSXedcRFV1234! -d master -i /usr/sql/sqlSchema.sql -No

sleep 3

# Start the Backend containers
echo "📦 Preparing to start the backend containers..."
docker compose -f Backend/docker-compose.yml up -d

sleep 3

# Start the Frontend containers
echo "📦 Preparing to start the frontend containers..."
docker compose -f Frontend/docker-compose.yml up -d
