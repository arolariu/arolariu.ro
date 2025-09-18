#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy project files in dependency order
COPY ["src/Common/arolariu.Backend.Common.csproj", "src/Common/"]
COPY ["src/Core.Auth/arolariu.Backend.Core.Auth.csproj", "src/Core.Auth/"]
COPY ["src/Invoices/arolariu.Backend.Domain.Invoices.csproj", "src/Invoices/"]
COPY ["src/Core/arolariu.Backend.Core.csproj", "src/Core/"]

# Restore dependencies
RUN dotnet restore "src/Core/arolariu.Backend.Core.csproj"

# Copy all source code
COPY src/ src/

# Build the application
WORKDIR "/src/src/Core"
RUN dotnet build "arolariu.Backend.Core.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "arolariu.Backend.Core.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app

# Install additional packages for health checks and debugging
USER root
RUN apt-get update && apt-get install -y \
	curl \
	&& rm -rf /var/lib/apt/lists/*

# Copy the published application
COPY --from=publish /app/publish .

# Switch back to non-root user
USER $APP_UID

# Define health check
HEALTHCHECK --interval=60s --timeout=3s --start-period=10s --retries=3 \
	CMD curl --fail http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "arolariu.Backend.Core.dll"]
