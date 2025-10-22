###############################################################################
# Backend API Container Image for arolariu.ro - see https://api.arolariu.ro
# Backend API Container Image based on .NET 10 ASP.NET runtime and SDK images
#
# Key points:
# - Uses central MSBuild configuration (Directory.Build.props) and central package
#   management (Directory.Packages.props). These MUST be copied before restore
#   so that TargetFramework and PackageVersion metadata exist during restore.
#
# - Layering optimised: copy only project + central props first for cacheable restore.
#
# - Publishes trimmed build output (no app host) to a clean runtime image.
#
# See more:
# 1. https://aka.ms/dotnet-container-images
# 2. https://aka.ms/customizecontainer
###############################################################################

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0
EXPOSE 8080 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# 1. Copy central build + package management metadata FIRST (required for restore)
COPY Directory.Build.props ./
COPY Directory.Packages.props ./

# 2. Copy project files (only *.csproj) to leverage Docker layer caching
COPY src/Common/arolariu.Backend.Common.csproj src/Common/
COPY src/Core.Auth/arolariu.Backend.Core.Auth.csproj src/Core.Auth/
COPY src/Invoices/arolariu.Backend.Domain.Invoices.csproj src/Invoices/
COPY src/Core/arolariu.Backend.Core.csproj src/Core/

# 3. Restore
RUN dotnet restore src/Core/arolariu.Backend.Core.csproj

# 4. Copy the full source tree AFTER restore
COPY . .

RUN dotnet build src/Core/arolariu.Backend.Core.csproj \
  --no-restore \
  -c "$BUILD_CONFIGURATION" \
  -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish src/Core/arolariu.Backend.Core.csproj \
  --no-restore \
  -c "$BUILD_CONFIGURATION" \
  -o /app/publish \
  /p:UseAppHost=false


# Final layer - runtime image with published app.
FROM base AS final
WORKDIR /app

USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .
USER app

HEALTHCHECK --interval=60s --timeout=3s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "arolariu.Backend.Core.dll"]
