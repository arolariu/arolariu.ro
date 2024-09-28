# Local (on-premises) container-based solution

## Overview

This document describes the steps required to deploy the local (on-premises) container-based solution.

## Prerequisites

- Docker
- Docker Compose
- Git

## Deployment

1. Clone the repository
2. Navigate to the `Infra/Local` directory
3. Run the `self-hosted.sh` script to start the services
4. Access the services at the following URLs:
   - Grafana: `http://localhost:3000`
   - Healthcheck container: `localhost:8080`
   - MS NoSQL Server: `localhost:8081`
   - MS SQL Server: `localhost:8082`

## Configuration

The services can be configured by modifying the `.env` file in the `Infra/Local` directory.

## Stopping the services

To stop the services, run the `selfhost-stop.sh` script.
