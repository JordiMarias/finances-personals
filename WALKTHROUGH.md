# Walkthrough: Millores d'Usabilitat (Format dd/mm/aaaa, Botons de Categoria i Calendar Picker)

S'han implementat i verificat amb èxit totes les millores d'usabilitat sol·licitades:

---

## 🛠️ Canvis Implementats

### 1. Format de Dates `dd/mm/aaaa` a tot arreu
- El formulari d'anotar despeses, la taula de moviments recents, la capçalera i els cicles mostren i gestionen les dates exclusivament en l'estàndard català/europeu `dd/mm/aaaa` (ex: `12/09/2026`), eliminant el format americà `mm/dd/aa`.
- El camp de data del formulari disposa d'un input de text sincronitzat i d'un botó directe per obrir el calendari natiu.

### 2. Selecció de Categories mitjançant Graella de Botons (Elecció Obligatòria)
- S'han eliminat els selectors dropdown (`<select>`) amb valors per defecte, que provocaven assignacions incorrectes accidentals.
- S'ha implementat una **graella de targetes/botons visuals** amb icona, nom, color i percentatge per a cada categoria.
- En prémer "+ Nova Despesa" general, **no hi ha cap categoria seleccionada per defecte** i el formulari bloqueja el registre mostrant una advertència (`⚠️ Heu de seleccionar obligatòriament una categoria.`) si l'usuari no en tria una expressament.
- Si l'usuari clica "+ Anotar Despesa" directament sobre una targeta de categoria concreta, aquella categoria apareix automàticament preseleccionada.
- Aplicat tant a despeses diàries com a despeses recurrents.

### 3. Calendar Picker en clicar el requadre de la Data a la Capçalera
- En fer clic directament sobre el requadre de data central de la capçalera (entre `◀` i `▶`), s'invoca el selector de calendari natiu (`showPicker()`), permetent seleccionar qualsevol dia a l'instant amb un sol toc.

---

## 🧪 Verificació i Proves

1. **Testos Unitaris en Rust (`cargo test`)**: 5/5 aprovats.
2. **Compilació WebAssembly (`wasm-pack build`)**: 100% completada amb èxit.
3. **Proves Funcionals al Navegador**:
   - Validació del format `dd/mm/aaaa` a tota la interfície.
   - Verificació del bloqueig per falta de categoria seleccionada i de la selecció visual per botons.
   - Verificació de l'obertura del datepicker en prémer el requadre de data.
