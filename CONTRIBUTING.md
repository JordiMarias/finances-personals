# Guia de Contribució (Contributing Guide)

Gràcies pel vostre interès a contribuir al **Gestor de Finances Personals**!

Aquest document recull les pautes recomanades per desenvolupar, provar i col·laborar en aquest projecte.

---

## 🛠️ Requisits de Desenvolupament

- **Rust**: Versió estable (1.70+ recomanada).
- **Cargo**: Gestor de paquets i compilació de Rust.
- **Navegador Web modern**: Chrome, Firefox, Safari o Edge.

---

## 🚀 Flux de Treball

1. **Bifurca (Fork) el repositori** i clona'l al teu entorn local.
2. **Crea una branca per a la teva funcionalitat o correcció**:
   ```bash
   git checkout -b feature/nom-de-la-millora
   ```
3. **Fes els canvis pertinents** mantenint el codi net i comentat on calgui.
4. **Executa la suite de testos unitaris**:
   ```bash
   cargo test
   ```
5. **Verifica la compilació en mode release**:
   ```bash
   cargo build --release
   ```
6. **Fes un commit amb missatges clars i descriptius**:
   ```bash
   git commit -m "feat: afegeix suport per a nova funcionalitat"
   ```
7. **Obre una Pull Request (PR)** explicant els canvis i el context de la millora.

---

## 🧪 Convencions de Codi

- **Rust**:
  - Seguir les convencions estàndard de formatació (`cargo fmt`).
  - No afegir dependències pesades externes de C / `.so` per preservar la portabilitat autònoma.
- **Frontend (Web)**:
  - HTML semàntic i accessible.
  - CSS modular seguint la paleta corporativa de banca digital.
  - JavaScript natiu (ES6+) net i sense dependències innecessàries.
