#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing mkcert + generating root CA ==="
if ! command -v mkcert >/dev/null 2>&1; then
  MKCERT_VERSION="v1.4.4"
  curl -sSL "https://github.com/FiloSottile/mkcert/releases/download/${MKCERT_VERSION}/mkcert-${MKCERT_VERSION}-linux-amd64" \
       -o /tmp/mkcert
  sudo mv /tmp/mkcert /usr/local/bin/mkcert
  sudo chmod +x /usr/local/bin/mkcert
fi
mkcert -install

echo "=== Generating *.localhost wildcard cert for Traefik ==="
mkdir -p infra/Local/Management/certs
cd infra/Local/Management/certs
if [[ ! -f local-cert.pem ]] || [[ ! -f local-key.pem ]]; then
  mkcert -key-file local-key.pem -cert-file local-cert.pem "localhost" "*.localhost"
fi
cd -

echo "=== Installing Node deps ==="
npm install

echo "=== Restoring .NET workloads + packages ==="
dotnet workload restore || true
dotnet restore ./arolariu.slnx

echo "=== Installing docfx global tool ==="
dotnet tool install -g docfx || true

echo "=== Installing Playwright browsers ==="
npx playwright install --with-deps || true

echo "=== Creating Python virtual environment for exp ==="
if [[ ! -d sites/exp.arolariu.ro/.venv ]]; then
  cd sites/exp.arolariu.ro
  python -m venv .venv
  .venv/bin/pip install --upgrade pip
  .venv/bin/pip install -r requirements.txt
  cd -
fi

echo ""
echo "=== Setup complete ==="
echo "Run: npm run dev  (Aspire mode — default)"
echo "  or: npm run dev:selfhost  (legacy containerized stack)"
