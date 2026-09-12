#!/usr/bin/env bash
echo "================================================================="
echo "   🏛️ GESTOR DE FINANCES PERSONALS (DESKTOP & WEB APP)"
echo "================================================================="
echo "🦀 Compilant el motor Rust a WebAssembly (WASM)..."
wasm-pack build --target web --out-dir www/pkg
echo "🚀 Executant l'aplicació nativa en Rust amb interfície d'escriptori..."
cargo run --release
