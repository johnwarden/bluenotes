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
