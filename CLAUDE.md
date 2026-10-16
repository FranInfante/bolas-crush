# Bolas Crush — contexto para Claude

Tercer juego de **Heladerías Bolas (Sevilla)**: un match-3 que copia reglas, combos, ritmo y curva de **Candy Crush Saga**, con piel sevillana (sabores reales, tiendas como episodios, el equipo hablando en andaluz). Hermanos: `../bolas-game` (Overcooked, Three.js) y `../bolas-imperio` (idle, SVG). Todo en **español**: textos, comentarios y commits (cortos).

Plan, decisiones y fases: `docs/PLAN.md`. Mapa de notas: `Hub.md`.

## Reglas
- **Datos reales de Bolas**, nunca inventados: `../bolas-imperio/docs/CONTEXTO-BOLAS-REAL.md` (sabores §2, tiendas §1, personal §6, marca §8). Lo no confirmado lleva `porConfirmar: true`.
- **De Candy Crush se copian reglas, tiempos y curva; nunca arte, sonidos, nombres ni tableros de King.** Niveles propios.
- Sin vidas: perder un nivel = repetir cuando quieras. Sin dinero real, sin anuncios, sin datos personales.
- **Publicar solo cuando Fran lo pida.** Ramas `feature/fran-<n>-<tema>` → `dev` → `stage` → `prod` por MR; prod solo con su «Vale».
- **Dónde se publica:** GitHub Pages, repo público `FranInfante/bolas-crush` (remoto `github`). Stage = https://franinfante.github.io/bolas-crush/ con `bash scripts/publicar.sh` desde la rama `stage`. Nada en servidores de Javi/jcubo (Fran, 17-10: «nada de servers de javi»).
- Antes de dar algo por hecho: `npm test` y `npm run typecheck` limpios y **probado en el navegador** (launch.json → `bolas-crush`, puerto 5190, vertical de móvil).
- Lo pesado (`npm ci`, builds largos) va por `turno`.

## Arrancar
```bash
npm install
npm run dev     # http://localhost:5173
npm test        # motor (node --test)
```

## Código (`src/`)
| Carpeta | Qué hay |
|---|---|
| `motor/` | Reglas puras sin gráficos: tablero, matches, especiales, combos, gravedad, barajado, puntos, objetivos. Con tests `*.test.ts`. |
| `juego/` | PixiJS: dibujo de bolas, animaciones, partículas, sonido, pantallas, mapa. |
| `datos/` | Sabores, niveles (JSON/TS), equipo y frases andaluzas. |
