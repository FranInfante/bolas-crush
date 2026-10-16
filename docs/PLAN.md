# Bolas Crush: plan de acción v1

Estado: **pendiente del visto bueno de Fran** (16-10-2026). No se programa hasta que conteste la página de decisiones.

## Qué es
Tercer juego de Bolas, hermano de `bolas-game` (Overcooked) y `bolas-imperio`. Un match-3 que copia el *feel* de Candy Crush Saga
(tablero, especiales, combos, ritmo de animación, curva de dificultad) con piel sevillana: sabores reales de Bolas, tiendas como episodios,
equipo como personajes y mensajes en andaluz.

## Fuentes de contexto (no duplicar, enlazar)
- Sabores, tiendas, personal, marca: `D:\projects\personal\bolas-imperio\docs\CONTEXTO-BOLAS-REAL.md` (§1, §2, §6, §8)
- Sabores en datos: `bolas-game\src\data\flavors.ts`, `bolas-imperio\src\data\sabores.ts`
- Frases sevillanas: `bolas-game\src\data\voices.ts`
- Personajes: `bolas-game\docs\DISEÑO.md` (Chema, Pablo, Marcos, Rocío)
- Marca web: `bolas\assets\estilos.css`; logos e hitos (Giralda, Torre del Oro, Setas, Puente, Mercado) en `bolas\assets\`
- Candy Crush (investigación): resumen en este plan, §Mecánicas

## Mecánicas copiadas de Candy Crush
- Tablero 9x9 (formas irregulares en niveles), 6 colores, gravedad + relleno + cascadas en bucle, barajado si no hay jugadas, pista a los 5 s.
- Especiales: 4 en línea → rayada; L/T → envuelta; 5 → bola de color.
- Combos: rayada+rayada (fila+columna), rayada+envuelta (cruz 3+3), envuelta+envuelta (5x5 doble), bola+normal (todo ese color),
  bola+rayada/envuelta (convierte y detona), bola+bola (tablero entero).
- Puntos múltiplos de 20, 60 por bola en un trío, multiplicador por cascada, 3 estrellas por umbral, bonus final con movimientos sobrantes.
- Animación: swap ~180 ms, swap inválido con rebote ~250 ms, caída con gravedad y rebote por columnas desfasadas, partículas del color, temblor en combos grandes.
- Objetivos por orden de aparición: puntos → limpiar casillas (gelatina) → bajar ingredientes → pedido de sabores. Bloqueadores v1: hielo de 1-2 capas, candado.

## Piel Bolas
| Candy Crush | Bolas Crush |
|---|---|
| Caramelos | Bolas de helado de 6 sabores reales |
| Rayado / envuelto / bola de color | Bola con sirope / tarrina / bola Bolas (logo) |
| Gelatina | Manchas en el mostrador |
| Ingredientes (cereza, avellana) | Carapinas que hay que bajar |
| Glaseado | Escarcha del congelador |
| Episodios | Tiendas: Herbolarios, Orfila, Feria, Triana, Arenal |
| "Sweet! Tasty! Divine!" | "¡Ole!", "¡Qué arte!", "¡Esto es de categoría!" |
| "Sugar Crush!" | "¡BOLAZO!" |

## Fases (v1 = primer episodio jugable, 15 niveles)
0. **Arranque** (Opus): repo git, `CLAUDE.md`, `Hub.md`, Vite + TS, enlaces a contexto.
1. **Motor puro con tests** (Sonnet): tablero, matches, especiales, combos, gravedad, barajado, puntos. Sin gráficos.
2. **Render y feel** (Sonnet): animaciones, partículas, sonido sintetizado (WebAudio, como los hermanos).
3. **Niveles 1-15 + mapa** (Sonnet): niveles en JSON, objetivos, hielo y candado, mapa de Herbolarios con hitos.
4. **Equipo y voz** (Sonnet): Rocío de tutorial, Marcos con pedidos, Chema/Pablo/Fanny con mensajes andaluces.
5. **Revisión** (Opus): probar en navegador (móvil vertical), página de cambios con capturas, enlace para Fran.

## Decisiones (Fran, 16-10-2026: «TODO OK» = las recomendadas)
Página: https://claude.ai/artifact/HBMGGsFV9Ziv1WicnoQMf5
1. Render: **PixiJS** (2D).
2. Fichas: **Fresa, Mango, Limón, Pistacho, Chocolate Belga, Mora** (Mora `porConfirmar`).
3. Niveles **propios** con la curva de Candy Crush.
4. **Sin vidas**: si pierdes, repites cuando quieras.
5. **Fanny trabaja en tienda** y trae los pedidos de clientes.
6. Publicar en **stage jcubo** como el Overcooked (repo nuevo en GitLab).
7. Bolas **dibujadas por código** en la v1.
