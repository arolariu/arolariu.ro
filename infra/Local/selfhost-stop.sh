# This script will stop the docker containers that were started by the selfhost-start.sh script.

# Stop the Frontend containers
echo "📦 Preparing to stop the frontend containers..."
docker compose -f Frontend/docker-compose.yml down

sleep 2

# Stop the Backend containers
echo "📦 Preparing to stop the backend containers..."
docker compose -f Backend/docker-compose.yml down

sleep 2

# Stop the Storage containers
echo "📦 Preparing to stop the storage containers..."
docker compose -f Storage/docker-compose.yml down

sleep 2

# Stop the Management containers
echo "📦 Preparing to stop the management containers..."
docker compose -f Management/docker-compose.yml down
