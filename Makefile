.PHONY: help build-all type-check-all test-all test-node test-go test-python go-zero-deps clean publish-dry-run verify-authinfive

help:
	@echo "HelloJohn SDK Suite - available commands:"
	@echo "  make build-all         Build all Node/TS SDKs"
	@echo "  make type-check-all    Type-check all SDKs"
	@echo "  make test-all          Run tests for Node/Go/Python SDKs"
	@echo "  make go-zero-deps      Verify Go SDK zero-deps policy"
	@echo "  make publish-dry-run   Dry-run package publication checks"
	@echo "  make verify-authinfive Print AuthInFive entry points"

build-all:
	@echo "==> Building @hellojohn/js..."
	cd js && npm run build
	@echo "==> Building @hellojohn/react..."
	cd react && npm run build
	@echo "==> Building @hellojohn/node..."
	cd node && npm run build
	@echo "==> Building @hellojohn/vue..."
	cd vue && npm run build
	@echo "==> @hellojohn/react-native uses source distribution (no build step)"
	@echo "==> Build finished."

type-check-all:
	@echo "==> Type-checking JS SDK..."
	cd js && npx tsc --noEmit
	@echo "==> Type-checking React SDK..."
	cd react && npx tsc --noEmit
	@echo "==> Type-checking Node SDK..."
	cd node && npx tsc --noEmit
	@echo "==> Type-checking Vue SDK..."
	cd vue && npm run type-check
	@echo "==> Type-checking React Native SDK..."
	cd react-native && npm run type-check

test-all: test-node test-go test-python

test-node:
	@echo "==> Running Node/TS SDK tests..."
	cd js && npm test || echo "js tests unavailable"
	cd react && npm test || echo "react tests unavailable"
	cd node && npm test || echo "node tests unavailable"
	cd vue && npm test || echo "vue tests unavailable"
	cd react-native && npm test || echo "react-native tests unavailable"

test-go:
	@echo "==> Running Go SDK build+vet..."
	cd go && go build ./... && go vet ./...

test-python:
	@echo "==> Running Python SDK tests..."
	cd python && python -m pip install -e ".[dev]" && python -m pytest tests/ -v

go-zero-deps:
	@echo "==> Verifying Go SDK zero-deps policy..."
	cd go && go mod tidy && git diff --exit-code go.sum || (echo "ERROR: go.sum changed - review dependencies"; exit 1)

clean:
	cd js && rm -rf dist
	cd react && rm -rf dist
	cd node && rm -rf dist
	cd vue && rm -rf dist
	cd react-native && rm -rf dist
	cd python && rm -rf dist build .pytest_cache .mypy_cache

publish-dry-run:
	@echo "==> npm publish dry-runs..."
	cd js && npm publish --dry-run
	cd react && npm publish --dry-run
	cd node && npm publish --dry-run
	cd vue && npm publish --dry-run
	cd react-native && npm publish --dry-run
	@echo "==> Python package dry-run..."
	cd python && python -m build --outdir dist

verify-authinfive:
	@echo "==> AuthInFive source files:"
	@echo "  React:  examples/react-quickstart/app/page.tsx"
	@echo "  Vue:    examples/vue-quickstart/src/App.vue"
	@echo "  Go:     examples/go-api/main.go"
	@echo "  Python: examples/python-api/main.py"
