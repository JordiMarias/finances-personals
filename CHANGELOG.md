# Registre de Canvis (Changelog)

Tots els canvis notables en aquest projecte es documenten en aquest fitxer.

El format es basa en [Keep a Changelog](https://keepachangelog.com/ca/1.0.0/) i aquest projecte segueix [Semantic Versioning](https://semver.org/).

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
