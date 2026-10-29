#!/usr/bin/env bash
# Análise no SonarQube local. Precisa de SONAR_TOKEN no .env (token de análise do projeto).
# O repo é montado no mesmo caminho dentro do container para os caminhos do lcov baterem.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
[ -f .env ] && . ./.env
set +a
: "${SONAR_TOKEN:?defina SONAR_TOKEN no .env}"
npm run test:coverage >/dev/null
docker run --rm --network host \
  -e SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}" \
  -e SONAR_TOKEN \
  -v "$PWD:$PWD" -w "$PWD" \
  sonarsource/sonar-scanner-cli:11 -Dsonar.projectBaseDir="$PWD" -Dsonar.qualitygate.wait=true
