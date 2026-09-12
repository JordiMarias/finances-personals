# 🏛️ Gestor de Finances Personals: Planificació & Control Diari

**Gestor de Finances Personals** és una aplicació bancària i de gestió financera diària, desenvolupada en **Rust** i **HTML5/CSS3/JS**, amb un disseny corporatiu net inspirat en la banca digital.

Està dissenyada per a compilar-se de forma nativa a **Linux** (sense dependències externes `.so`), **Windows**, **macOS**, **Android** i **WebAssembly (WASM)**.

---

## 💡 Concepte Financer i Funcionalitats Clau

A diferència dels pressupostos mensuals tradicionals que s'avaluen a mes passat, aquesta eina calcula la capacitat de despesa a un **límit diari net disponible**:

1. **Salari Mínim Interprofessional (SMI) per Defecte**:
   - L'assistent d'onboarding inicialitza el camp de sou amb el valor de referència del SMI (1.323,00 € en 12 pagues), permetent a l'usuari ajustar-lo fàcilment segons els seus ingressos reals.

2. **Percentatges de Partides Totalment Editables**:
   - L'usuari pot personalitzar lliurement els percentatges assignats a cada categoria tant a l'assistent com al panell de configuració, amb recàlcul en temps real del pressupost diari i mensual:
     - 🏠 **Habitatge** (Recomanat: 30%)
     - 🚗 **Transport / Mobilitat** (Recomanat: 10%)
     - 🛒 **Alimentació bàsica** (Recomanat: 10%)
     - ⚡ **Subministraments i serveis** (Recomanat: 5%)
     - 🎉 **Oci / Despeses personals** (Recomanat: 25%)
     - 📈 **Estalvi i inversions** (Recomanat: 20%)

3. **Deducció automàtica de despeses periòdiques (recurrents)**:
   - Les despeses anuals, trimestrals i mensuals es mensualitzen i es descompten de la partida diària assignada per assegurar un límit disponible real.

4. **Acumulació Diària i Control de Superàvit**:
   - Cada dia que no es consumeix la totalitat del límit d'una partida, el saldo disponible creix de forma acumulativa.
   - A final de mes, els romanents positius es mouen a **Fons d'Emergència** (Habitatge/Transport/Subministraments), **Fons d'Objectius** (Oci/Projectes) i **Fons d'Inversió**.

5. **Còpies de Seguretat (Exportar i Importar fitxers JSON)**:
   - Permet desar l'estat complet de l'aplicació en un fitxer `.json` i restaurar-lo en qualsevol altre dispositiu, navegador o instància d'escriptori.

6. **Paritat Total entre Escriptori (Rust) i Web**:
   - En executar el binari compilat en Rust (`cargo run` o `./run_app.sh`), s'inicia un servidor HTTP embegut ultralleuger (sense dependències `.so`) i s'obre directament una finestra d'aplicació d'escriptori amb la mateixa interfície gràfica.

---

## ⚡ Com Executar

### 1. Execució d'Escriptori i Web (Natiu Rust)
```bash
cargo run --release
```
o bé mitjançant l'script:
```bash
./run_app.sh
```

### 2. Mode Resum per Terminal (CLI)
```bash
cargo run -- --cli
```

### 3. Executar la Bateria de Testos Financers
```bash
cargo test
```

---

## 📁 Estructura del Projecte

```
Budgeting/
├── Cargo.toml               # Configuració del projecte Rust (Lib + CLI + WASM)
├── src/
│   ├── lib.rs               # Llibreria Rust del motor financer
│   ├── main.rs              # Binari d'escriptori amb servidor embegut i llançador GUI
│   ├── model.rs             # Model de dades financer (SMI per defecte, Categories, Fons)
│   ├── engine.rs            # Motor de càlcul diari i liquidació de final de mes
│   ├── storage.rs           # Serialització JSON
│   └── wasm_api.rs          # Exportació de bindings per a JS/WASM
├── tests/
│   └── engine_tests.rs      # Testos unitaris financers
├── www/
│   ├── index.html           # Interfície d'usuari corporativa (estil CaixaBank)
│   ├── style.css            # Sistema de disseny corporatiu bancari
│   └── app.js               # Controlador JS, gestor de percentatges i còpies JSON
├── run_app.sh               # Script d'execució d'escriptori / web
├── README.md                # Aquest document
└── WALKTHROUGH.md           # Resum de canvis i verificació
```
