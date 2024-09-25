# This script will stop the docker containers that were started by the selfhost-start.sh script.

# Stop the Storage container
echo "📦 Preparing to stop the storage container..."
docker compose -f Storage/docker-compose.yml down

# Stop the Management container
echo "📦 Preparing to stop the management container..."
docker compose -f Management/docker-compose.yml down
