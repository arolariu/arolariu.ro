#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["arolariu.Backend.Core.csproj", "."]
RUN dotnet restore "./arolariu.Backend.Core.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "arolariu.Backend.Core.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "arolariu.Backend.Core.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "arolariu.Backend.Core.dll"]


# Install additional packages
RUN apt-get update && apt-get install -y \
	curl \
	&& rm -rf /var/lib/apt/lists/*

HEALTHCHECK --interval=60s --timeout=3s \
	CMD curl --fail http://localhost:80/health || exit 1