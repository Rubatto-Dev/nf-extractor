#!/usr/bin/env bash
# Resumo da última análise no SonarQube local: métricas, issues abertas e hotspots.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
[ -f .env ] && . ./.env
set +a
: "${SONAR_TOKEN:?defina SONAR_TOKEN no .env}"
API="${SONAR_HOST_URL:-http://localhost:9000}/api"
get() { curl -sf -u "$SONAR_TOKEN:" "$API/$1"; }

get "measures/component?component=nf-extractor&metricKeys=coverage,bugs,vulnerabilities,code_smells,security_hotspots,duplicated_lines_density,ncloc" |
  jq -r '.component.measures[] | "\(.metric): \(.value)"'
echo "--- issues abertas"
get "issues/search?componentKeys=nf-extractor&resolved=false&ps=100" |
  jq -r '.issues[] | "\(.severity) \(.type) \(.component | sub("nf-extractor:"; "")):\(.line // "-") \(.rule) — \(.message)"'
echo "--- hotspots"
if hotspots=$(get "hotspots/search?projectKey=nf-extractor&ps=100"); then
  jq -r '.hotspots[] | "\(.vulnerabilityProbability) \(.component | sub("nf-extractor:"; "")):\(.line // "-") \(.message)"' <<<"$hotspots"
else
  echo "sem permissão para listar hotspots com este token: ver em ${API%/api}/security_hotspots?id=nf-extractor"
fi
