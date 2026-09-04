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
