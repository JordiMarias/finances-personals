# Walkthrough: Gestor de Finances Personals (Estil CaixaBank)

S'ha dut a terme una transformació completa de l'aplicació per convertir-la en un **Gestor de Finances Personals** professional, amb disseny corporatiu de banca digital (estil CaixaBank), paritat total entre l'execució d'escriptori (Rust) i web, salari mínim per defecte, percentatges totalment editables i sistema de còpies de seguretat en fitxers JSON.

---

## 🛠️ Canvis Implementats

### 1. Disseny Corporatiu Professional (Estil CaixaBank)
- **Paleta de Colors i Estètica**:
  - Blau marí intens (`#002b49` / `#001e33`) i blau corporatiu (`#007ea8`), amb targetes blanques sobre fons gris-clar (`#f4f7fa`).
  - Nomenclatura seriosa i bancària: eliminació de termes de videojoc (*quests, streaks, ratxes*) i substitució per termes financers reals (*Límit diari net disponible, Saldo acumulat, Liquidació de període mensual, Fons de reserva i d'inversió*).
- **Tipografia i Maquetació**:
  - Ús de `Plus Jakarta Sans` i xifres amb alineació tabular (`tabular-nums`) per a una lectura impecable de les xifres financeres.

### 2. Salari Mínim Interprofessional (SMI) per Defecte
- El formulari inicial d'onboarding i l'estat per defecte inicialitzen el sou net mensual amb el valor del **SMI de referència (1.323,00 € / mes en 12 pagues)**.
- S'inclou un missatge informatiu d'ajuda indicant la referència del valor i facilitant que l'usuari l'augmenti segons els seus ingressos reals.

### 3. Percentatges de Partides Pressupostàries Editables
- Tant a l'assistent d'onboarding com a la finestra de Configuració, s'ha implementat una taula interactiva amb inputs numèrics per editar el percentatge de cadascuna de les 6 categories.
- **Recàlcul en viu**: Quan es canvia un percentatge, s'actualitza a l'instant el total de percentatge (amb indicador verd si suma 100% o advertència si no suma 100%) i els imports mensuals (€) i diaris (€/dia).
- Botó de restauració directa als valors recomanats per defecte (30% Habitatge, 10% Transport, 10% Alimentació, 5% Subministraments, 25% Oci, 20% Estalvi).

### 4. Paritat Total entre Escriptori (Rust) i Web
- S'ha actualitzat [src/main.rs](file:///home/jordimarias/Desktop/Budgeting/src/main.rs) incorporant un servidor HTTP embegut ultralleuger basat exclusivament en la llibreria estàndard de Rust (`std::net::TcpListener`), sense dependències externes `.so`.
- En executar `cargo run --release` o `./run_app.sh`, l'aplicació incrusta tots els actius web (`index.html`, `style.css`, `app.js`) directament al binari i obre de forma immediata una finestra d'aplicació d'escriptori amb la mateixa interfície gràfica.
- També s'inclou el paràmetre `--cli` (`cargo run -- --cli`) per a qui vulgui consultar el resum financer des del terminal.

### 5. Còpies de Seguretat (Exportar i Importar fitxers JSON)
- **Exportar Còpia (.json)**: Genera i descarrega al disc un fitxer `.json` amb l'estat complet de l'aplicació (sou, percentatges personalitzats, despeses recurrents, historial de moviments, dia actual i fons acumulats).
- **Importar Còpia (.json)**: Permet carregar qualsevol fitxer de còpia prèvia des del disc (accessible des de la capçalera, la finestra de configuració i la primera pantalla de l'onboarding).

---

## 🧪 Verificació i Proves

### 1. Testos Automatitzats (`cargo test`)
Tots els testos unitaris financers s'executen amb èxit:
```
test test_daily_accumulation_and_expense ... ok
test test_end_of_month_settlement ... ok
test test_ods_financial_values ... ok
```

### 2. Proves Funcionals amb Navegador
Mitjançant el subagent de navegació s'ha verificat:
1. **Onboarding Pas 1**: Estètica CaixaBank, sou per defecte de 1.323,00 €, edició dinàmica de percentatges i recàlcul en temps real.
2. **Onboarding Pas 2**: Afegiment de despeses recurrents i transició fluida al tauler principal.
3. **Dashboard Principal**: Visualització de mètriques KPI, targetes de partides amb barres de progrés i saldos acumulats.
4. **Operacions Diàries**: Anotació de noves despeses, actualització de l'historial i del saldo de cada categoria.
5. **Simulació i Liquidació**: Funcionament de l'avançament de dia i descàrrega de la còpia de seguretat en format JSON.
