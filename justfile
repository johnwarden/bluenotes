lint:
	yarn lint --quiet

web:
	yarn web

ios-simulator:
	open -a Simulator.app

ios:
	npx expo run:ios