#!/bin/sh
set -eu

apk add --no-cache curl jq > /dev/null 2>&1

API_URL="http://zitadel-api:8080"
ZITADEL_HOST="${ZITADEL_DOMAIN:-localhost}:${ZITADEL_EXTERNALPORT:-8080}"
BASE_URL="${ZITADEL_PUBLIC_SCHEME:-http}://${ZITADEL_DOMAIN:-localhost}:${ZITADEL_EXTERNALPORT:-8080}"
PAT_FILE="/zitadel/bootstrap/bootstrap-sa.pat"
OUTPUT_FILE="/output/swagger-config.json"
MAX_WAIT=120

# ── Wait for PAT ──────────────────────────────────────────────────────────────
echo "[bootstrap] Waiting for Zitadel PAT..."
elapsed=0
while [ ! -s "$PAT_FILE" ]; do
    if [ $elapsed -ge $MAX_WAIT ]; then
        echo "[bootstrap] ERROR: PAT file not available after ${MAX_WAIT}s" >&2
        exit 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
done
PAT=$(cat "$PAT_FILE")
echo "[bootstrap] PAT loaded."

# ── Helpers ───────────────────────────────────────────────────────────────────
api_post() {
    curl -sf \
        -H "Authorization: Bearer $PAT" \
        -H "Content-Type: application/json" \
        -H "Host: ${ZITADEL_HOST}" \
        -X POST \
        --data "$2" \
        "${API_URL}${1}"
}

api_get() {
    curl -sf \
        -H "Authorization: Bearer $PAT" \
        -H "Host: ${ZITADEL_HOST}" \
        "${API_URL}${1}"
}

api_put() {
    curl -sf \
        -H "Authorization: Bearer $PAT" \
        -H "Content-Type: application/json" \
        -H "Host: ${ZITADEL_HOST}" \
        -X PUT \
        --data "$2" \
        "${API_URL}${1}"
}

# ── 1. Create or find project ─────────────────────────────────────────────────
echo "[bootstrap] Resolving project 'NexTalk'..."
EXISTING_PROJ=$(api_post "/management/v1/projects/_search" '{"queries":[{"nameQuery":{"name":"NexTalk","method":"TEXT_QUERY_METHOD_EQUALS"}}]}')
PROJECT_ID=$(echo "$EXISTING_PROJ" | jq -r '.result[0].id // empty')

if [ -z "$PROJECT_ID" ]; then
    PROJ_RESP=$(api_post "/management/v1/projects" '{"name":"NexTalk"}')
    PROJECT_ID=$(echo "$PROJ_RESP" | jq -r '.id')
    echo "[bootstrap] Created project: $PROJECT_ID"
else
    echo "[bootstrap] Project exists: $PROJECT_ID"
fi

# ── 2. Create or find OIDC app ────────────────────────────────────────────────
resolve_oidc_app() {
    local app_name="$1"
    local redirect_uri="$2"
    local post_logout_uri="$3"

    EXISTING_APPS=$(api_post "/management/v1/projects/${PROJECT_ID}/apps/_search" \
        "{\"queries\":[{\"nameQuery\":{\"name\":\"${app_name}\",\"method\":\"TEXT_QUERY_METHOD_EQUALS\"}}]}")
    EXISTING_ID=$(echo "$EXISTING_APPS" | jq -r '.result[0].oidcConfig.clientId // empty')

    if [ -n "$EXISTING_ID" ]; then
        echo "[bootstrap] App '$app_name' exists: $EXISTING_ID" >&2
        echo "$EXISTING_ID"
        return
    fi

    APP_RESP=$(api_post "/management/v1/projects/${PROJECT_ID}/apps/oidc" \
        "{\"name\":\"${app_name}\",\
\"redirectUris\":[\"${redirect_uri}\"],\
\"responseTypes\":[\"OIDC_RESPONSE_TYPE_CODE\"],\
\"grantTypes\":[\"OIDC_GRANT_TYPE_AUTHORIZATION_CODE\"],\
\"appType\":\"OIDC_APP_TYPE_USER_AGENT\",\
\"authMethodType\":\"OIDC_AUTH_METHOD_TYPE_NONE\",\
\"postLogoutRedirectUris\":[\"${post_logout_uri}\"],\
\"version\":\"OIDC_VERSION_1_0\",\
\"devMode\":true,\
\"accessTokenType\":\"OIDC_TOKEN_TYPE_JWT\",\
\"idTokenUserinfoAssertion\":true}")

    CLIENT_ID=$(echo "$APP_RESP" | jq -r '.clientId')
    echo "[bootstrap] Created app '$app_name': $CLIENT_ID" >&2
    echo "$CLIENT_ID"
}

echo "[bootstrap] Resolving OIDC apps..."
SPA_CLIENT_ID=$(resolve_oidc_app \
    "NexTalk SPA" \
    "${BASE_URL}/callback" \
    "${BASE_URL}")

SWAGGER_CLIENT_ID=$(resolve_oidc_app \
    "NexTalk Swagger UI" \
    "${BASE_URL}/swagger/oauth2-redirect.html" \
    "${BASE_URL}/swagger")

# ── 3. Write output ───────────────────────────────────────────────────────────
# Flat keys are read by the unified Swagger UI HTML (browser side).
# Nested "Zitadel" object is read by .NET IConfiguration on backend services
# (AddJsonFile populates Zitadel:ProjectId etc.).
mkdir -p "$(dirname "$OUTPUT_FILE")"
cat > "${OUTPUT_FILE}.tmp" <<EOF
{
  "projectId": "${PROJECT_ID}",
  "spaClientId": "${SPA_CLIENT_ID}",
  "swaggerClientId": "${SWAGGER_CLIENT_ID}",
  "Zitadel": {
    "ProjectId": "${PROJECT_ID}",
    "SpaClientId": "${SPA_CLIENT_ID}",
    "SwaggerClientId": "${SWAGGER_CLIENT_ID}"
  }
}
EOF
mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"

echo "[bootstrap] Done."
cat "$OUTPUT_FILE"
