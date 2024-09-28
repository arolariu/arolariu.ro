# This script will start the docker containers that are needed for the selfhost project.

# Start the Management container
echo "📦 Preparing to start the management container..."
docker compose -f Management/docker-compose.yml up -d

# Start the Storage container
echo "📦 Preparing to start the storage container..."
docker compose -f Storage/docker-compose.yml up -d
