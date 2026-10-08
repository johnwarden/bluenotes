set shell := ["bash", "-euo", "pipefail", "-c"]

# List recipes
default:
	@just --list

# Lint (oxlint)
lint:
	pnpm lint --quiet

# Typecheck iOS, Android, and web
typecheck:
	pnpm typecheck

# Run the web app (Expo on port 19006)
web:
	pnpm web

# Open the iOS Simulator (macOS only)
ios-simulator:
	open -a Simulator.app

# Run the iOS app
ios:
	npx expo run:ios

# Install locked JS deps (root + bskyembed)
deps:
	pnpm install --frozen-lockfile
	cd bskyembed && pnpm install --frozen-lockfile

# Build and serve bskyweb against public AppView
bskyweb:
	cd bskyweb/; go mod tidy; go build -v -tags timetzdata -o bskyweb ./cmd/bskyweb; ./bskyweb serve --appview-host=https://public.api.bsky.app

# Unit tests
test:
	pnpm test

# Every CI gate this justfile can run
check: lint typecheck test
