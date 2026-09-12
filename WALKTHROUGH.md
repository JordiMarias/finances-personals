# Walkthrough: Gestor de Finances Personals (Unificació en Rust WebAssembly)

S'ha transformat l'aplicació per convertir **Rust** en l'única font de veritat financera (*Single Source of Truth*), executat tant de manera nativa com al navegador mitjançant **WebAssembly (WASM)**.

---

## 🛠️ Canvis Implementats

### 1. Motor WebAssembly en Rust ([src/wasm_api.rs](file:///home/jordimarias/Desktop/finances-personals/src/wasm_api.rs))
- Ampliació de l'API exportada mitjançant `#[wasm_bindgen]` per gestionar tot el cicle de vida:
  - Càlcul de resums de categories i mètriques KPI (`wasm_get_all_summaries`).
  - Creació, edició i eliminació de despeses diàries i recurrents.
  - Modificació de percentatges i restauració de valors per defecte.
  - Simulació d'avançament de dies i liquidació de tancament de mes amb transferència de romanents a fons.

### 2. Capa de Presentació JavaScript Pura ([www/app.js](file:///home/jordimarias/Desktop/finances-personals/www/app.js))
- S'ha eliminat tota duplicitat d'algorismes matemàtics en JavaScript.
- L'aplicació s'ha migrat a mòdul ES6 (`<script type="module" src="app.js"></script>`) i inicialitza directament el binari WASM (`./pkg/budgeting_app.js` i `.wasm`).
- El frontend ara s'encarrega exclusivament de la interacció amb el DOM, formularis i emmagatzematge local (`localStorage`).

### 3. Servidor Local i Paritat Desktop ([src/main.rs](file:///home/jordimarias/Desktop/finances-personals/src/main.rs))
- El servidor HTTP integrat de zero dependències ara serveix correctament el tipus MIME `application/wasm` i la ruta `/pkg/*`.

### 4. Automatització de GitHub Pages ([.github/workflows/deploy-pages.yml](file:///home/jordimarias/Desktop/finances-personals/.github/workflows/deploy-pages.yml))
- El workflow compila automàticament el paquet WebAssembly amb `wasm-pack` abans de publicar a GitHub Pages.

---

## 🧪 Verificació i Proves

1. **Testos Unitari en Rust**: Execució de `cargo test` amb 3/3 testos aprovats.
2. **Compilació WASM**: Execució de `wasm-pack build --target web --out-dir www/pkg` amb èxit.
3. **Proves Funcionals amb Navegador**: Verificació completa del flux d'onboarding, assignació de percentatges, despeses fixes, despeses diàries, simulació de dies i exportació JSON.
