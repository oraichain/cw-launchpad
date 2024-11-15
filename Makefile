WASM_OPT := $(shell wasm-opt --version 2>/dev/null)

.PHONY: test-all
test-all: clippy test

.PHONY: clippy
clippy:
	cargo clippy --tests -- -D warnings

.PHONY: test
# test: unit-test 
test: unit-test integration-test

.PHONY: unit-test
unit-test:
	cargo test

.PHONY: integration-test
integration-test: _build
	yarn
	yarn test

.PHONY: build
build: _build compress schema

.PHONY: _build
_build:
	cargo build --release --target wasm32-unknown-unknown
	mkdir --parents ./build
ifdef WASM_OPT
	wasm-opt -Oz ./target/wasm32-unknown-unknown/release/tier.wasm -o ./build/tier.wasm
	wasm-opt -Oz ./target/wasm32-unknown-unknown/release/ido.wasm -o ./build/ido.wasm
else
	cp ./target/wasm32-unknown-unknown/release/tier.wasm ./build/tier.wasm
	cp ./target/wasm32-unknown-unknown/release/ido.wasm ./build/ido.wasm
endif

.PHONY: compress
compress: tier.wasm.gz ido.wasm.gz

tier.wasm.gz: build/tier.wasm
	cat ./build/tier.wasm | gzip -9 > ./build/tier.wasm.gz

ido.wasm.gz: build/ido.wasm
	cat ./build/ido.wasm | gzip -9 > ./build/ido.wasm.gz

.PHONY: schema
schema:
	cargo run --release --example schema-tier
	cargo run --release --example schema-ido

.PHONY: clean
clean:
	cargo clean
	rm -rf ./node_modules
	rm -rf ./build/tier.wasm
	rm -rf ./build/tier.wasm.gz
	rm -rf ./build/ido.wasm
	rm -rf ./build/ido.wasm.gz
