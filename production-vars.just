# Production Environment Variables for Bluenotes Deployment
# This file contains all environment variables needed for production deployment

# =============================================================================
# BUILD-TIME VARIABLES (passed to Docker build via --build-arg)
# =============================================================================

# Application Environment
EXPO_PUBLIC_ENV := "production"

# Release Information (automatically synced with package.json)
EXPO_PUBLIC_RELEASE_VERSION := `node -p "require('./package.json').version"`
EXPO_PUBLIC_BUNDLE_IDENTIFIER := "bluenotes-production"

EXPO_PUBLIC_CHAT_PROXY_DID := "did:web:api.bsky.chat"
EXPO_PUBLIC_BLUESKY_PROXY_DID:= "did:web:api.bsky.app"

# Sentry Configuration (disabled for now)
EXPO_PUBLIC_SENTRY_DSN := ""

# Geolocation Configuration (use our own IPCC service)
GEOLOCATION_URL := "https://bluenotes.social/ipcc"

# =============================================================================
# RUNTIME VARIABLES (passed via fly deploy --env)
# =============================================================================

# AT Protocol Services
ATP_APPVIEW_HOST := "https://public.api.bsky.app"
OGCARD_HOST := "https://ogcard.cdn.bsky.app"
LINK_HOST := ""

# Web Server Configuration (HTTP_ADDRESS is set in fly.toml)
DEBUG := "false"

# CORS Configuration
CORS_ALLOWED_ORIGINS := "https://bluenotes.social,https://www.bluenotes.social,https://bluenotes-web.fly.dev"

# CDN and Performance
STATIC_CDN_HOST := ""

# Instance Configuration
BSKY_CANONICAL_INSTANCE := "false"
ROBOTS_DISALLOW_ALL := "false"

# Logging
GOLOG_LOG_LEVEL := "info"

# =============================================================================
# FLY.IO CONFIGURATION
# =============================================================================

# App Configuration
DOMAIN := "bluenotes.social"