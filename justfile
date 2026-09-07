import "production-vars.just"

lint:
	pnpm lint --quiet

typecheck:
	pnpm typecheck

web:
	pnpm web

ios-simulator:
	open -a Simulator.app

ios:
	npx expo run:ios

deps:
	pnpm install --frozen-lockfile
	cd bskyembed && pnpm install --frozen-lockfile

bskyweb:
	cd bskyweb/; go mod tidy; go build -v -tags timetzdata -o bskyweb ./cmd/bskyweb; ./bskyweb serve --appview-host=https://public.api.bsky.app

# =============================================================================
# PRODUCTION DEPLOYMENT (Fly.io) — do not run from this probe
# =============================================================================

release:
	./prepare-release-interactive.sh

prod-env:
	@echo "🔧 Environment variables status:"
	@echo "EXPO_PUBLIC_ENV: {{EXPO_PUBLIC_ENV}}"
	@echo "EXPO_PUBLIC_RELEASE_VERSION: {{EXPO_PUBLIC_RELEASE_VERSION}}"
	@echo "EXPO_PUBLIC_BUNDLE_IDENTIFIER: {{EXPO_PUBLIC_BUNDLE_IDENTIFIER}}"
	@echo "EXPO_PUBLIC_SENTRY_DSN: {{EXPO_PUBLIC_SENTRY_DSN}}"
	@echo "EXPO_PUBLIC_CHAT_PROXY_DID: {{EXPO_PUBLIC_CHAT_PROXY_DID}}"
	@echo "EXPO_PUBLIC_BLUESKY_PROXY_DID: {{EXPO_PUBLIC_BLUESKY_PROXY_DID}}"
	@echo "ATP_APPVIEW_HOST: {{ATP_APPVIEW_HOST}}"
	@echo "DOMAIN: {{DOMAIN}}"
	@echo "GEOLOCATION_URL: {{GEOLOCATION_URL}}"

deploy:
	@echo "🚀 Deploying Bluenotes to Fly.io..."
	fly deploy \
		--build-arg EXPO_PUBLIC_ENV={{EXPO_PUBLIC_ENV}} \
		--build-arg EXPO_PUBLIC_RELEASE_VERSION={{EXPO_PUBLIC_RELEASE_VERSION}} \
		--build-arg EXPO_PUBLIC_BUNDLE_IDENTIFIER={{EXPO_PUBLIC_BUNDLE_IDENTIFIER}} \
		--build-arg EXPO_PUBLIC_SENTRY_DSN={{EXPO_PUBLIC_SENTRY_DSN}} \
		--build-arg EXPO_PUBLIC_CHAT_PROXY_DID={{EXPO_PUBLIC_CHAT_PROXY_DID}} \
		--build-arg EXPO_PUBLIC_BLUESKY_PROXY_DID={{EXPO_PUBLIC_BLUESKY_PROXY_DID}} \
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
