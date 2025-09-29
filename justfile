# Bluenotes Social App Management Commands
# Usage: just <command>

import "production-vars.just"

set dotenv-load := false

help:
    @just --list --unsorted

# Default recipe - show available commands
default:
    @just --list

# =============================================================================
# DEVELOPMENT COMMANDS
# =============================================================================

lint:
	yarn lint --quiet

typecheck:
	npm run typecheck

web:
	yarn web

ios-simulator:
	open -a Simulator.app

ios:
	npx expo run:ios

deps:
	yarn install --frozen-lockfile
	cd bskyembed && yarn install --frozen-lockfile

bskyweb:
	cd bskyweb/; go mod tidy; go build -v -tags timetzdata -o bskyweb ./cmd/bskyweb; ./bskyweb serve --appview-host=https://public.api.bsky.app

# =============================================================================
# PRODUCTION DEPLOYMENT
# =============================================================================

# Check environment variables (non-sensitive only)
prod-env:
    @echo "🔧 Environment variables status:"
    @echo "EXPO_PUBLIC_ENV: {{EXPO_PUBLIC_ENV}}"
    @echo "EXPO_PUBLIC_RELEASE_VERSION: {{EXPO_PUBLIC_RELEASE_VERSION}}"
    @echo "EXPO_PUBLIC_BUNDLE_IDENTIFIER: {{EXPO_PUBLIC_BUNDLE_IDENTIFIER}}"
    @echo "EXPO_PUBLIC_SENTRY_DSN: {{EXPO_PUBLIC_SENTRY_DSN}}"
    @echo "ATP_APPVIEW_HOST: {{ATP_APPVIEW_HOST}}"
    @echo "OGCARD_HOST: {{OGCARD_HOST}}"
    @echo "LINK_HOST: {{LINK_HOST}}"
    @echo "DOMAIN: {{DOMAIN}}"
    @echo "DEBUG: {{DEBUG}}"
    @echo "CORS_ALLOWED_ORIGINS: {{CORS_ALLOWED_ORIGINS}}"
    @echo "STATIC_CDN_HOST: {{STATIC_CDN_HOST}}"
    @echo "BSKY_CANONICAL_INSTANCE: {{BSKY_CANONICAL_INSTANCE}}"
    @echo "ROBOTS_DISALLOW_ALL: {{ROBOTS_DISALLOW_ALL}}"
    @echo "GOLOG_LOG_LEVEL: {{GOLOG_LOG_LEVEL}}"
    @echo "GEOLOCATION_URL: {{GEOLOCATION_URL}}"

allocate-ips:
	fly ips allocate

# Set up SSL certificate
setup-cert:
    fly certs add {{DOMAIN}}
#    fly certs add www.{{DOMAIN}}

# Set secrets interactively (SECRETS ONLY - never saved to files)
# Currently no secrets needed - Sentry is disabled
setup-secrets:
    @echo "🔐 No secrets currently configured (Sentry disabled)"
    @echo "💡 When you enable Sentry later, add SENTRY_AUTH_TOKEN and BASIC_AUTH_PASSWORD as a secret"
    # fly secrets set SENTRY_AUTH_TOKEN=
    # fly secrets set BASIC_AUTH_PASSWORD=

# Deploy Bluenotes to Fly.io
deploy:
    @echo "🚀 Deploying Bluenotes to Fly.io..."
    fly deploy \
        --build-arg EXPO_PUBLIC_ENV={{EXPO_PUBLIC_ENV}} \
        --build-arg EXPO_PUBLIC_RELEASE_VERSION={{EXPO_PUBLIC_RELEASE_VERSION}} \
        --build-arg EXPO_PUBLIC_BUNDLE_IDENTIFIER={{EXPO_PUBLIC_BUNDLE_IDENTIFIER}} \
        --build-arg EXPO_PUBLIC_SENTRY_DSN={{EXPO_PUBLIC_SENTRY_DSN}} \
        --env ATP_APPVIEW_HOST={{ATP_APPVIEW_HOST}} \
        --env OGCARD_HOST={{OGCARD_HOST}} \
        --env LINK_HOST={{LINK_HOST}} \
        --env DEBUG={{DEBUG}} \
        --env DOMAIN={{DOMAIN}} \
        --env CORS_ALLOWED_ORIGINS={{CORS_ALLOWED_ORIGINS}} \
        --env STATIC_CDN_HOST={{STATIC_CDN_HOST}} \
        --env BSKY_CANONICAL_INSTANCE={{BSKY_CANONICAL_INSTANCE}} \
        --env ROBOTS_DISALLOW_ALL={{ROBOTS_DISALLOW_ALL}} \
        --env GOLOG_LOG_LEVEL={{GOLOG_LOG_LEVEL}} \
        --env GEOLOCATION_URL={{GEOLOCATION_URL}}

# Build Docker image locally for testing
docker-build:
    @echo "🐳 Building Docker image locally..."
    docker build \
        --build-arg EXPO_PUBLIC_ENV={{EXPO_PUBLIC_ENV}} \
        --build-arg EXPO_PUBLIC_RELEASE_VERSION={{EXPO_PUBLIC_RELEASE_VERSION}} \
        --build-arg EXPO_PUBLIC_BUNDLE_IDENTIFIER={{EXPO_PUBLIC_BUNDLE_IDENTIFIER}} \
        --build-arg EXPO_PUBLIC_SENTRY_DSN={{EXPO_PUBLIC_SENTRY_DSN}} \
        --progress=plain \
        -t bluenotes-web .

# Complete Fly.io deployment setup
fly-setup:
    @echo "🚀 Complete Fly.io deployment setup for Bluenotes..."
    @echo "Creating Fly.io app..."
    fly apps create bluenotes-web
    @echo "Allocating IPS..."
    just allocate-ips
    @echo "Setting up SSL certificate..."
    just setup-cert
    @echo "Deploying application..."
    #just deploy
    @echo "✅ Bluenotes deployment complete!"
    @echo "🔗 Your Bluenotes app is available at: https://{{DOMAIN}}"

# =============================================================================
# MONITORING & MANAGEMENT
# =============================================================================

# Check service health
health:
    @curl -s "https://{{DOMAIN}}/" | head -20 || echo "❌ Service not responding"

# One-command health check of everything
status: health fly-status

# Restart the Fly.io application
restart-app:
    fly app restart

# Check Fly.io app status
fly-status:
    fly status

# Open Fly.io dashboard
fly-dashboard:
    fly dashboard

# Show recent live application logs
app-logs:
    fly logs

# Show recent live HTTP logs with filtering
http-logs:
    fly logs | grep -E "(GET|POST|PUT|DELETE|HEAD)"
