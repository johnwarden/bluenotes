
SHELL = /bin/bash
.SHELLFLAGS = -o pipefail -c

.PHONY: help
help: ## Print info about all commands
	@echo "Commands:"
	@echo
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "    \033[01;32m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: build-web
build-web: ## Compile web bundle, copy to bskyweb directory
	pnpm intl:build
	pnpm build-web

.PHONY: build-web-embed
build-web-embed: ## Compile web embed bundle, copy to bskyweb/embedr* directories
	pnpm intl:build
	pnpm build-embed

.PHONY: test
test: ## Run all tests
	NODE_ENV=test pnpm test

.PHONY: lint
lint: ## Run style checks and verify syntax
	pnpm run lint

#.PHONY: fmt
#fmt: ## Run syntax re-formatting
#	pnpm prettier

.PHONY: deps
deps: ## Installs dependent libs using 'pnpm install'
	pnpm install --frozen-lockfile
	cd bskyembed && yarn install --frozen-lockfile

.PHONY: nvm-setup
nvm-setup: ## Use NVM to install and activate node+pnpm
	nvm install 24
	nvm use 24
	npm install --global pnpm

.PHONY: ALL_LOGOS
ALL_LOGOS:
	cd ./assets && make ALL_LOGOS && make clean;

.PHONY: SUPPORT_PAGES
SUPPORT_PAGES:
	cd ./src/view/screens && make SUPPORT_PAGES && make clean;
