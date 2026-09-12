# Walkthrough: Privacitat Local-First i Tutorial Interactiu (v0.5.0)

S'han implementat i verificat amb èxit les dues noves millores sol·licitades per a l'aplicació:

---

## 🛠️ Canvis Implementats

### 1. Avís de Privacitat i Custòdia de Dades 100% Local (`#modalPrivacy`)
- **Arquitectura Local-First**: S'explica amb total transparència que l'aplicació funciona íntegrament en local al navegador de l'usuari mitjançant el motor compilat en **WebAssembly (Rust)**.
- **Sense servidors externs, rastrejadors ni cookies**: No s'envia cap dada financera a l'exterior.
- **Custòdia en mans de l'usuari**: Totes les dades es guarden a `localStorage`. L'usuari disposa dels botons **Exportar (.json)** i **Importar (.json)** per fer còpies de seguretat i recuperar-les quan vulgui.
- **Accés directe**: Botó `🔒 100% Privat` a la barra superior i a l'assistent inicial de configuració.

### 2. Tutorial Interactiu Pas a Pas (`#modalTutorial`)
- **Accés fàcil**: Botó `🎓 Com Funciona?` a la capçalera i a l'assistent inicial.
- **Carrusel Interactiu de 5 Passos**:
  1. **Pas 1 (Límit Diari Net)**: Explica com el sou net mensual, un cop descomptades les despeses fixes mensuals, es distribueix entre els dies del cicle per donar un límit real diari per categoria.
  2. **Pas 2 (La Màgia del Saldo Acumulat)**: Exemple pràctic i visual pas a pas de com el pressupost d'oci (ex: 15 €/dia) s'acumula si no es gasta (Dilluns +15 €, Dimarts +30 €, Dimecres sopar de 35 € -> saldo restant de +10 € sense deute).
  3. **Pas 3 (Calendari i Dates Reals)**: Guia sobre la navegació entre dies (`◀`, `▶`, `Avui` o calendar picker), anotació de despeses passades amb recàlcul retroactiu i planificació futura.
  4. **Pas 4 (Tancament de Mes i Fons de Reserva)**: Explicació de la liquidació als 3 fons (Emergència, Objectius i Inversió) al final del cicle.
  5. **Pas 5 (Privacitat i Còpies de Seguretat JSON)**: Recordatori de seguretat i truc per fer còpies mensuals.
- **Navegació Àgil**: Botons *Anterior* / *Següent* i salts directes prement els indicadors del pas superior.

---

## 🧪 Verificació i Proves

1. **Testos Unitaris en Rust (`cargo test`)**: 5/5 aprovats.
2. **Compilació WebAssembly (`wasm-pack build`)**: 100% completada amb èxit a `www/pkg`.
3. **Proves Automatitzades al Navegador (`browser_subagent`)**:
   - Obertura del modal de Privacitat (`🔒 100% Privat`), revisió de continguts i tancament correcte.
   - Obertura del Tutorial Interactiu (`🎓 Com Funciona?`), navegació seqüencial pels 5 passos, visualització de l'exemple del sopar a Pas 2, salt directe al Pas 2 des de l'indicador superior i tancament correcte.

