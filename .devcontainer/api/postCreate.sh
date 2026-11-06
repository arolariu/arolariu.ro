#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "$repository_root/.git" ]] && ! git -C "$repository_root" rev-parse --show-toplevel > /dev/null; then
  printf 'Source checkout Git metadata is not accessible inside the container. Use a regular clone; external host Git directories are not mounted.\n' >&2
  exit 1
fi

dotnet_cache="${HOME}/.cache/api-dotnet"
nuget_cache="${HOME}/.nuget/packages"

for cache in "$dotnet_cache" "$nuget_cache"; do
  if ! mountpoint -q -- "$cache"; then
    printf 'API preparation requires a mounted cache: %s\n' "$cache" >&2
    exit 1
  fi
done

for cache in "$dotnet_cache" "$nuget_cache"; do
  if [[ ! -w "$cache" ]]; then
    sudo chown "$(id -u):$(id -g)" "$cache"
  fi
done

cd "$repository_root/sites/api.arolariu.ro"
dotnet restore src/Core/arolariu.Backend.Core.csproj
dotnet restore tests/arolariu.Backend.Core.Tests/arolariu.Backend.Core.Tests.csproj
dotnet restore tests/arolariu.Backend.Domain.Tests/arolariu.Backend.Domain.Tests.csproj
