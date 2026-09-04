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
