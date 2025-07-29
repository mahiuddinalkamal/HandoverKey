#!/bin/bash

# Health check script for API service
# This script checks if the API is responding correctly

set -e

API_URL="${API_URL:-http://localhost:3001}"
HEALTH_ENDPOINT="${API_URL}/health"
TIMEOUT="${TIMEOUT:-10}"

echo "Checking API health at: ${HEALTH_ENDPOINT}"

# Check if the health endpoint responds with 200 status
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "${TIMEOUT}" "${HEALTH_ENDPOINT}" || echo "000")

if [ "$response" = "200" ]; then
    echo "✅ API health check passed"
    exit 0
else
    echo "❌ API health check failed - HTTP status: $response"
    exit 1
fi