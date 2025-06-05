# arolariu.ro Local Development Environment

## Overview

This repository contains a complete containerized development environment for the arolariu.ro project. The setup uses Docker Compose to orchestrate multiple containers organized in logical groups (Management, Storage, Backend, Frontend), allowing developers to run the entire stack locally.

## Architecture

The local environment is organized into four main container groups:

1. **Management** - Infrastructure monitoring and routing services

   - Traefik as a reverse proxy with dashboard

2. **Storage** - Database and persistence layer

   - Microsoft SQL Server
   - NoSQL database
   - Azurite for blob storage
   - Redis cache

3. **Backend** - API and service layer

   - Keycloak for identity management
   - Backend services and APIs

4. **Frontend** - User interface components
   - Frontend applications

## Prerequisites

To run this project locally, you need:

- **Docker** (20.10.0 or higher)
- **Docker Compose** (v2.0.0 or higher)
- **Git** (to clone the repository)
- 4GB+ RAM available for containers
- 10GB+ of free disk space

## Getting Started

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/arolariu/arolariu.ro.git
   cd arolariu.ro
   ```

2. Navigate to the local infrastructure directory:
   ```bash
   cd infra/Local
   ```

### Starting the Environment

Choose the appropriate startup script based on your operating system:

#### Windows

```cmd
selfhost-start.bat
```

#### Linux/macOS

```bash
./selfhost-start.sh
```

The startup process:

1. Starts Management containers (Traefik)
2. Deploys Storage containers (databases)
3. Creates and configures the SQL database
4. Launches Backend services
5. Starts Frontend applications

### Accessing Services

After startup completes, you can access the following services:

- **Traefik Dashboard**: [https://traefik.localhost](https://traefik.localhost) or [http://localhost:8090](http://localhost:8090)

  - Shows all configured routes and services

- **Keycloak Administration**: [https://keycloak.localhost](https://keycloak.localhost)

  - Default credentials: admin/qazWSXedcRFV1234!

- **Whoami Test Service**: [https://whoami.localhost](https://whoami.localhost)

  - Test service showing request information

- **SQL Server Connection Info**:

  - Host: `mssql.localhost` or `localhost`
  - Port: `8082`
  - Username: `sa`
  - Password: `qazWSXedcRFV1234!`

- **Cosmos DB Admin**: [https://cosmosdb.localhost](https://cosmosdb.localhost)
  - Web interface for database management

## Configuration

All service configurations are stored in:

1. Docker Compose files in each subdirectory:

   - `Management/docker-compose.yml`
   - `Storage/docker-compose.yml`
   - `Backend/docker-compose.yml`
   - `Frontend/docker-compose.yml`

2. Environment variables:
   - Update the `.env` file in the `infra/Local` directory to customize settings

## Stopping the Environment

To stop all running containers:

#### Windows

```cmd
selfhost-stop.bat
```

#### Linux/macOS

```bash
./selfhost-stop.sh
```

This will gracefully shut down all containers in reverse order:

1. Frontend
2. Backend
3. Storage
4. Management

## Troubleshooting

### Common Issues

- **Port Conflicts**: Ensure ports 80, 443, 8080-8090 are available on your machine
- **Container Startup Failures**: Check Docker logs with `docker logs [container_name]`
- **Database Connection Issues**: Verify that SQL Server has fully initialized (~30 seconds after startup)
- **SSL Certificate Warnings**: Local certificates are self-signed, you can add exceptions in your browser

### Logs and Debugging

- View container logs:

  ```bash
  docker logs -f [container_name]
  ```

- Check container status:
  ```bash
  docker ps
  ```

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) file for details on contributing to this project.
