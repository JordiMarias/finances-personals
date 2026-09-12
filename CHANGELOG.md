# Registre de Canvis (Changelog)

Tots els canvis notables en aquest projecte es documenten en aquest fitxer.

El format es basa en [Keep a Changelog](https://keepachangelog.com/ca/1.0.0/) i aquest projecte segueix [Semantic Versioning](https://semver.org/).

## [0.5.0] - 2026-09-12

### ✨ Noves Funcionalitats
- **Avís i Filosofia de Privacitat Local-First (`#modalPrivacy`)**:
  - Explicació clara i visible a la capçalera (`🔒 100% Privat`) i a l'assistent inicial que l'aplicació funciona 100% en local mitjançant WebAssembly (Rust).
  - Zero servidors externs, zero rastrejadors i zero galetes de seguiment.
  - Custòdia total de dades en mans de l'usuari mitjançant emmagatzematge `localStorage` i funcionalitat d'exportació/importació en fitxers JSON de seguretat.
- **Tutorial Interactiu Pas a Pas (`#modalTutorial`)**:
  - Guia interactiva en 5 passos amb accés des de la capçalera (`🎓 Com Funciona?`) i l'assistent.
  - **Pas 1 (Límit Diari Net)**: Del sou net mensual al pressupost diari real després de deduir despeses fixes i repartir per dies de cicle.
  - **Pas 2 (Saldo Acumulat)**: Explicació de l'acumulació diària amb l'exemple visual de 15 €/dia d'oci acumulat fins al sopar de 35 € de dimecres sense generar deute.
  - **Pas 3 (Calendari i Dates Reals)**: Navegació de dies, registre de despeses passades i planificació futura.
  - **Pas 4 (Tancament de Mes)**: Liquidació de superàvits als fons d'Emergència, Objectius i Inversió.
  - **Pas 5 (Privacitat i Còpies)**: Recomanacions de seguretat i còpia de resguard.
  - Navegació àgil amb botons Anterior/Següent i selector per passos directe.

---

## [0.4.0] - 2026-09-12

### ✨ Noves Funcionalitats
- **Format de Dates Europeu Estàndard (`dd/mm/aaaa`)**: Totes les dates de l'aplicació (pantalla d'anotar despesa, capçalera, taula de moviments i cicles) utilitzen el format `dd/mm/aaaa` en comptes del format americà.
- **Selector de Categories per Botons Interactius (Opcions Obligatòries)**: Substitució dels dropdowns (`<select>`) per una graella de botons visuals amb icones, noms i percentatges. No hi ha cap categoria preseleccionada per defecte en noves despeses generals i el formulari obliga a triar-ne una activament per evitar errors d'assignació.
- **Calendar Picker Natiu al Requadre de Data**: En prémer el requadre de data central de la capçalera (entre `◀` i `▶`), s'obre immediatament el selector de calendari per triar qualsevol dia.
- **Dates Reals de Calendari & Obertura al Dia Present**: L'aplicació s'obre directament al dia actual i permet navegar entre dies passats, presents i futurs amb recàlcul instantani de saldos en Rust WebAssembly.
- **Cicle de Facturació / Reset Personalitzable (1 a 28)**: Dia de tall del mes configurable amb recàlcul automàtic del període actiu.

---

## [0.3.0] - 2026-09-12

### ✨ Noves Funcionalitats
- **Unificació Total en Rust (WebAssembly)**: Tot el motor de càlcul financer, deduccions diàries, transicions d'estat i liquidació de final de mes s'executen exclusivament en Rust compilat a WebAssembly (`wasm-pack`).
- **Eliminació de Codi Duplicat**: JavaScript ara actua com a pura capa de presentació i manipulació del DOM (UI/UX), delegant el 100% de la lògica de negoci a WASM.
- **Servidor d'Escriptori amb Suport WASM**: Servidor HTTP en Rust amb suport natiu per a binaris `.wasm` (`application/wasm`) i mòduls ES6.
- **Workflow de Desplegament Automàtic a GitHub Pages**: Compilació automàtica del paquet WebAssembly mitjançant GitHub Actions abans de publicar.

---

## [0.2.0] - 2026-09-10

### ✨ Noves Funcionalitats
- **Disseny Corporatiu Professional**: Nova interfície d'usuari d'estil banca digital inspirada en CaixaBank (paleta blau marí/blau corporatiu, targetes blanques i tipografia `Plus Jakarta Sans`).
- **Salari SMI per Defecte**: Inicialització del sou net mensual a l'assistent amb el Salari Mínim Interprofessional (1.323,00 € / mes en 12 pagues).
- **Percentatges Editables en Temps Real**: Taula interactiva per modificar lliurement els percentatges assignats a les 6 partides pressupostàries amb recàlcul instantani.
- **Paritat Desktop i Web**: Execució del binari natiu en Rust (`cargo run`) amb servidor embegut lleuger que obre directament la interfície d'escriptori.
- **Còpies de Seguretat JSON**: Funcionalitat completa per exportar i importar fitxers `.json` de seguretat.

### 🔧 Millores
- Refactorització de la nomenclatura cap a una terminologia financera seriosa.
- Bateria de testos financers ampliada i verificada al 100%.

---

## [0.1.0] - 2026-09-10

### ✨ Versió Inicial
- Motor core en Rust (`budget_core`) per a deduccions diàries i acumulació de saldos.
- Suport per a despeses recurrents (anuals, trimestrals, mensuals).
- Tancament de període mensual amb liquidació a Fons d'Emergència, Objectius i Inversió.
- Prototip web inicial en mode fosc.
