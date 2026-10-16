// Motor de reglas de Bolas Crush (match-3 estilo Candy Crush). Puro: sin gráficos ni tiempo.
// Cada jugada devuelve la lista de Pasos en el orden en que el render los anima.
import type { Celda, EstadoPartida, Especial, Ficha, Movimiento, Nivel, Paso, Pos, Sabor } from './tipos.ts';
import { crearAzar } from './azar.ts';
import type { Azar } from './azar.ts';

/** Lo que falta del objetivo (solo se rellena el campo del objetivo del nivel; el resto queda a 0 / vacío). */
export interface Progreso {
  /** Capas de mancha que quedan (una celda con mancha doble cuenta 2). */
  manchas: number;
  /** Carapinas que faltan por sacar. */
  carapinas: number;
  /** Bolas que faltan de cada sabor del pedido. */
  pedido: { sabor: Sabor; n: number }[];
}

interface Corrida { celdas: Pos[]; h: boolean; sabor: Sabor }
interface Grupo { celdas: Pos[]; corridas: Corrida[]; sabor: Sabor }
interface Detonacion { pos: Pos; ficha: Ficha }
interface Pendiente { pos: Pos; radio: number; combo?: Especial }
/** Estado de la jugada en curso (se reinicia en cada `intercambiar`). */
interface Contexto {
  cascada: number;
  cola: Detonacion[];
  /** Escarchas ya tocadas en esta ronda: una capa como mucho por ronda. */
  danadas: Set<string>;
  creoEspecial: boolean;
  combo: null | 'dos' | 'bb';
}

const PTS_BOLA = 60;
const PTS_RAYA = 120;
const PTS_TARRINA = 200;
const PTS_BOLABOLAS = 200;
const PTS_CARAPINA = 10000;
const PTS_MANCHA = 1000;
const PTS_ESCARCHA = 20;
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

const clave = (p: Pos): string => `${p.f},${p.c}`;
const igual = (a: Pos, b: Pos): boolean => a.f === b.f && a.c === b.c;
const copia = (f: Ficha): Ficha => ({ ...f });

export class Partida {
  tablero: Celda[][];
  puntos = 0;
  movimientosRestantes: number;
  estado: EstadoPartida = 'jugando';
  /** Solo para tests: sustituye al azar al rellenar por arriba. */
  generador: (() => Sabor) | null = null;
  /** Solo para tests: apagar el barajado automático para mirar el tablero tal cual queda. */
  barajarAuto = true;

  private nivel: Nivel;
  private azar: Azar;
  private filas: number;
  private cols: number;
  private siguienteId = 1;
  private salidas = 0;
  private porEntrar: number;
  private pedidoRestante: { sabor: Sabor; n: number }[];
  private pendientes: Pendiente[] = [];
  private ctx: Contexto = { cascada: 0, cola: [], danadas: new Set(), creoEspecial: false, combo: null };

  constructor(nivel: Nivel) {
    this.nivel = nivel;
    this.azar = crearAzar(nivel.semilla);
    this.filas = nivel.forma.length;
    this.cols = nivel.forma[0].length;
    this.movimientosRestantes = nivel.movimientos;
    this.porEntrar = nivel.carapinasPorSalir ?? 0;
    this.pedidoRestante = nivel.objetivo.tipo === 'pedido' ? nivel.objetivo.pedido.map((x) => ({ ...x })) : [];
    this.tablero = nivel.forma.map((fila) => [...fila].map((ch) => ({
      existe: ch !== '.',
      ficha: null,
      mancha: (ch === 'm' || ch === 'K' ? 1 : ch === 'M' ? 2 : 0) as 0 | 1 | 2,
      escarcha: (ch === 'e' ? 1 : ch === 'E' ? 2 : 0) as 0 | 1 | 2,
      candado: ch === 'k' || ch === 'K',
      salida: ch === 's',
    })));
    this.llenarInicial();
  }

  // ------------------------------------------------------------------ API pública

  /** Lo que falta del objetivo. */
  get progreso(): Progreso {
    const o = this.nivel.objetivo;
    return {
      manchas: o.tipo === 'manchas' ? this.tablero.flat().reduce((s, c) => s + c.mancha, 0) : 0,
      carapinas: o.tipo === 'carapinas' ? Math.max(0, o.n - this.salidas) : 0,
      pedido: this.pedidoRestante.map((x) => ({ ...x })),
    };
  }

  estrellas(): 0 | 1 | 2 | 3 {
    return this.nivel.estrellas.filter((e) => this.puntos >= e).length as 0 | 1 | 2 | 3;
  }

  /** Potenciadores previos al nivel (como en Candy Crush): convierte bolas normales al azar en esos especiales. */
  ponerPotenciadores(especiales: Especial[]): void {
    const libres: Celda[] = [];
    this.recorrer((_, ce) => { if (ce.ficha?.tipo === 'bola' && ce.ficha.especial === 'ninguno' && !ce.candado) libres.push(ce); });
    this.azar.barajar(libres);
    especiales.forEach((esp, i) => {
      const ce = libres[i];
      if (!ce) return;
      const e = esp === 'rayaH' || esp === 'rayaV' ? (this.azar.siguiente() < 0.5 ? 'rayaH' : 'rayaV') : esp;
      ce.ficha = { ...ce.ficha!, especial: e, sabor: e === 'bolaBolas' ? -1 : ce.ficha!.sabor };
    });
  }

  /** Primer swap válido que encuentre (para la pista a los 5 s), o null si no hay jugadas. */
  pista(): [Pos, Pos] | null {
    for (let f = 0; f < this.filas; f++) for (let c = 0; c < this.cols; c++) {
      const a = { f, c };
      for (const b of [{ f, c: c + 1 }, { f: f + 1, c }]) if (this.valido(a, b)) return [a, b];
    }
    return null;
  }

  intercambiar(a: Pos, b: Pos): Paso[] {
    if (this.estado !== 'jugando' || !this.valido(a, b)) return [{ tipo: 'invalido', a, b }];
    this.movimientosRestantes--;
    this.cambiar(a, b);
    // Tras el cambio, la ficha que movió el jugador está en `b` y la otra en `a`.
    const pasos: Paso[] = [{ tipo: 'intercambio', a, b }];
    this.ctx = { cascada: 0, cola: [], danadas: new Set(), creoEspecial: false, combo: null };
    const fb = this.fichaEn(b)!, fa = this.fichaEn(a)!;
    const esCombo = fb.especial === 'bolaBolas' || fa.especial === 'bolaBolas' || (fb.especial !== 'ninguno' && fa.especial !== 'ninguno');
    const cascada = this.ciclo(pasos, [b, a], esCombo ? () => this.combinar(pasos, a, b) : null);

    const jaleo = this.nivelJaleo(cascada);
    if (jaleo) pasos.push({ tipo: 'jaleo', nivel: jaleo });
    if (this.objetivoCumplido() && this.puntos >= this.nivel.estrellas[0]) {
      this.estado = 'ganado';
      pasos.push({ tipo: 'bolazo' });
      this.bolazo(pasos);
      this.movimientosRestantes = 0;
      pasos.push({ tipo: 'fin', estado: 'ganado', estrellas: this.estrellas() });
    } else if (this.movimientosRestantes <= 0) {
      this.estado = 'perdido';
      pasos.push({ tipo: 'fin', estado: 'perdido', estrellas: 0 });
    } else if (this.barajarAuto) {
      pasos.push(...this.asegurarJugada());
    }
    return pasos;
  }

  /** Si no queda ninguna jugada, baraja las fichas (mismas fichas, sin tríos y con jugada). */
  asegurarJugada(): Paso[] {
    if (this.pista()) return [];
    const celdas: Pos[] = [];
    const fichas: Ficha[] = [];
    this.recorrer((p, ce) => {
      if (ce.ficha && ce.ficha.tipo === 'bola' && !ce.candado) { celdas.push(p); fichas.push(ce.ficha); }
    });
    const desde = new Map(fichas.map((f, i) => [f.id, celdas[i]]));
    for (let intento = 0; intento < 300; intento++) {
      const mezcla = this.azar.barajar([...fichas]);
      celdas.forEach((p, i) => { this.tablero[p.f][p.c].ficha = mezcla[i]; });
      if (this.buscarGrupos().length === 0 && this.pista()) {
        const movimientos: Movimiento[] = [];
        celdas.forEach((p, i) => {
          const d = desde.get(mezcla[i].id)!;
          if (!igual(d, p)) movimientos.push({ id: mezcla[i].id, desde: d, hasta: p });
        });
        return [{ tipo: 'barajar', movimientos }];
      }
    }
    // ponytail: sin solución tras 300 mezclas (tableros casi llenos de bloqueadores) se deja como está.
    celdas.forEach((p, i) => { this.tablero[p.f][p.c].ficha = fichas[i]; });
    return [];
  }

  // ------------------------------------------------------------------ tablero y utilidades

  private celda(p: Pos): Celda | undefined { return this.tablero[p.f]?.[p.c]; }
  private fichaEn(p: Pos): Ficha | null { return this.celda(p)?.ficha ?? null; }
  private recorrer(fn: (p: Pos, c: Celda) => void): void {
    for (let f = 0; f < this.filas; f++) for (let c = 0; c < this.cols; c++) if (this.tablero[f][c].existe) fn({ f, c }, this.tablero[f][c]);
  }
  /** Sabor con el que cuenta para un match; -1 si no hace match (hueco, vacío, carapina, bola Bolas). */
  private saborDe(f: number, c: number): Sabor {
    const x = this.tablero[f]?.[c]?.ficha;
    return x && x.tipo === 'bola' ? x.sabor : -1;
  }
  private nuevaFicha(tipo: 'bola' | 'carapina', sabor: Sabor): Ficha {
    return { id: this.siguienteId++, tipo, sabor, especial: 'ninguno' };
  }
  private saborRelleno(): Sabor { return this.generador ? this.generador() : this.azar.entero(this.nivel.sabores); }
  private cambiar(a: Pos, b: Pos): void {
    const ca = this.tablero[a.f][a.c], cb = this.tablero[b.f][b.c];
    [ca.ficha, cb.ficha] = [cb.ficha, ca.ficha];
  }

  /** Relleno inicial: sin tríos hechos y con al menos una jugada (se reintenta con el mismo RNG). */
  private llenarInicial(): void {
    for (let intento = 0; intento < 200; intento++) {
      this.recorrer((p, ce) => {
        ce.ficha = null;
        if (ce.escarcha > 0) return;
        if (this.nivel.forma[p.f][p.c] === 'c') { ce.ficha = this.nuevaFicha('carapina', -1); return; }
        const prohibidos = new Set<Sabor>();
        const a = this.saborDe(p.f, p.c - 1), b = this.saborDe(p.f, p.c - 2);
        if (a >= 0 && a === b) prohibidos.add(a);
        const u = this.saborDe(p.f - 1, p.c), v = this.saborDe(p.f - 2, p.c);
        if (u >= 0 && u === v) prohibidos.add(u);
        const libres = Array.from({ length: this.nivel.sabores }, (_, i) => i).filter((s) => !prohibidos.has(s));
        ce.ficha = this.nuevaFicha('bola', this.azar.elegir(libres));
      });
      if (this.pista()) return;
    }
  }

  // ------------------------------------------------------------------ swap

  private corrida(f: number, c: number, df: number, dc: number, s: Sabor): number {
    let n = 0;
    while (this.saborDe(f + df * (n + 1), c + dc * (n + 1)) === s) n++;
    return n;
  }
  private haceMatch(p: Pos): boolean {
    const s = this.saborDe(p.f, p.c);
    if (s < 0) return false;
    return 1 + this.corrida(p.f, p.c, 0, 1, s) + this.corrida(p.f, p.c, 0, -1, s) >= 3
      || 1 + this.corrida(p.f, p.c, 1, 0, s) + this.corrida(p.f, p.c, -1, 0, s) >= 3;
  }

  private valido(a: Pos, b: Pos): boolean {
    const ca = this.celda(a), cb = this.celda(b);
    if (!ca || !cb || !ca.existe || !cb.existe || !ca.ficha || !cb.ficha || ca.candado || cb.candado) return false;
    if (Math.abs(a.f - b.f) + Math.abs(a.c - b.c) !== 1) return false;
    const fa = ca.ficha, fb = cb.ficha;
    const bba = fa.especial === 'bolaBolas', bbb = fb.especial === 'bolaBolas';
    if (bba || bbb) return (bba && bbb) || (bba ? fb : fa).tipo === 'bola'; // la bola Bolas no se junta con carapinas
    if (fa.especial !== 'ninguno' && fb.especial !== 'ninguno') return true;
    this.cambiar(a, b);
    const ok = this.haceMatch(a) || this.haceMatch(b);
    this.cambiar(a, b);
    return ok;
  }

  // ------------------------------------------------------------------ matches

  private buscarGrupos(): Grupo[] {
    const corridas: Corrida[] = [];
    for (let f = 0; f < this.filas; f++) for (let c = 0; c < this.cols;) {
      const s = this.saborDe(f, c);
      let e = c;
      while (s >= 0 && this.saborDe(f, e + 1) === s) e++;
      if (s >= 0 && e - c >= 2) corridas.push({ h: true, sabor: s, celdas: Array.from({ length: e - c + 1 }, (_, i) => ({ f, c: c + i })) });
      c = e + 1;
    }
    for (let c = 0; c < this.cols; c++) for (let f = 0; f < this.filas;) {
      const s = this.saborDe(f, c);
      let e = f;
      while (s >= 0 && this.saborDe(e + 1, c) === s) e++;
      if (s >= 0 && e - f >= 2) corridas.push({ h: false, sabor: s, celdas: Array.from({ length: e - f + 1 }, (_, i) => ({ f: f + i, c })) });
      f = e + 1;
    }
    // Corridas que comparten una celda (cruces L/T) forman un mismo grupo.
    const porCelda = new Map<string, number[]>();
    corridas.forEach((r, i) => r.celdas.forEach((p) => porCelda.set(clave(p), [...(porCelda.get(clave(p)) ?? []), i])));
    const visto = new Set<number>();
    const grupos: Grupo[] = [];
    corridas.forEach((_, i) => {
      if (visto.has(i)) return;
      const cola = [i];
      visto.add(i);
      const g: Grupo = { celdas: [], corridas: [], sabor: corridas[i].sabor };
      const claves = new Set<string>();
      while (cola.length) {
        const r = corridas[cola.pop()!];
        g.corridas.push(r);
        for (const p of r.celdas) {
          if (!claves.has(clave(p))) { claves.add(clave(p)); g.celdas.push(p); }
          for (const j of porCelda.get(clave(p))!) if (!visto.has(j)) { visto.add(j); cola.push(j); }
        }
      }
      grupos.push(g);
    });
    return grupos;
  }

  /** 5 en línea → bolaBolas; L/T → tarrina; 4 → raya perpendicular a la línea. */
  private decidirEspecial(g: Grupo, preferidas: Pos[]): { pos: Pos; especial: Especial } | null {
    const largo = Math.max(...g.corridas.map((r) => r.celdas.length));
    let especial: Especial, ideal: Pos;
    if (largo >= 5) {
      const r = g.corridas.find((x) => x.celdas.length >= 5)!;
      especial = 'bolaBolas';
      ideal = r.celdas[Math.floor(r.celdas.length / 2)];
    } else if (g.corridas.some((r) => r.h) && g.corridas.some((r) => !r.h)) {
      especial = 'tarrina';
      const enH = new Set(g.corridas.filter((r) => r.h).flatMap((r) => r.celdas.map(clave)));
      ideal = g.celdas.find((p) => enH.has(clave(p)) && g.corridas.some((r) => !r.h && r.celdas.some((q) => igual(p, q)))) ?? g.celdas[0];
    } else if (largo === 4) {
      const r = g.corridas.find((x) => x.celdas.length === 4)!;
      especial = r.h ? 'rayaV' : 'rayaH';
      ideal = r.celdas[1];
    } else return null;
    const enGrupo = new Set(g.celdas.map(clave));
    const sirve = (p: Pos) => { const ce = this.celda(p)!; return !!ce.ficha && !ce.candado && ce.ficha.especial === 'ninguno'; };
    // El especial nace donde movió el jugador si esa celda está en el match; si no, en el punto ideal.
    const pos = [...preferidas.filter((p) => enGrupo.has(clave(p))), ideal, ...g.celdas].find(sirve);
    return pos ? { pos, especial } : null;
  }

  // ------------------------------------------------------------------ ciclo eliminar → caer → rellenar

  /** Repite rondas hasta que no queden matches ni explosiones pendientes. Devuelve la cascada máxima. */
  private ciclo(pasos: Paso[], preferidas: Pos[], inicio: (() => void) | null): number {
    const c = this.ctx;
    let cascada = 0;
    if (inicio) {
      cascada = c.cascada = 1;
      c.danadas = new Set();
      inicio();
      this.procesarCola(pasos);
      this.caer(pasos);
    }
    for (let guarda = 0; guarda < 500; guarda++) {
      if (this.pendientes.length) {
        // Segunda explosión de las tarrinas: misma cascada que la primera (es parte de la misma detonación).
        c.cascada = cascada;
        c.danadas = new Set();
        const lista = this.pendientes;
        this.pendientes = [];
        for (const pe of lista) {
          const celdas = this.cuadrado(pe.pos, pe.radio);
          pasos.push({ tipo: 'detonar', pos: pe.pos, especial: 'tarrina', ...(pe.combo ? { combo: pe.combo } : {}), celdas });
          this.limpiar(pasos, celdas, -1);
        }
        this.procesarCola(pasos);
        this.caer(pasos);
        continue;
      }
      const grupos = this.buscarGrupos();
      if (!grupos.length) break;
      cascada++;
      c.cascada = cascada;
      c.danadas = new Set();
      this.rondaMatches(pasos, grupos, cascada === 1 ? preferidas : []);
      this.procesarCola(pasos);
      this.caer(pasos);
    }
    return cascada;
  }

  private rondaMatches(pasos: Paso[], grupos: Grupo[], preferidas: Pos[]): void {
    for (const g of grupos) {
      const crea = this.decidirEspecial(g, preferidas);
      const quitar = crea ? g.celdas.filter((p) => !igual(p, crea.pos)) : g.celdas;
      this.limpiar(pasos, quitar, g.sabor, g.celdas.length);
      if (!crea) continue;
      const lateral: Paso[] = [];
      this.tocarMancha(crea.pos, lateral); // la ficha del especial «se elimina» del match: la mancha de debajo baja
      const ce = this.celda(crea.pos)!;
      const ficha: Ficha = { ...ce.ficha!, especial: crea.especial, sabor: crea.especial === 'bolaBolas' ? -1 : ce.ficha!.sabor };
      ce.ficha = ficha;
      this.puntos += crea.especial === 'tarrina' ? PTS_TARRINA : crea.especial === 'bolaBolas' ? PTS_BOLABOLAS : PTS_RAYA;
      this.ctx.creoEspecial = true;
      pasos.push({ tipo: 'crearEspecial', pos: crea.pos, ficha: copia(ficha) }, ...lateral);
    }
    // Un match al lado de una escarcha le quita una capa.
    const lateral: Paso[] = [];
    for (const g of grupos) for (const p of g.celdas) for (const [df, dc] of DIRS) {
      const q = { f: p.f + df, c: p.c + dc };
      if ((this.celda(q)?.escarcha ?? 0) > 0) this.dañarEscarcha(q, lateral);
    }
    pasos.push(...lateral);
  }

  private dañarEscarcha(p: Pos, lateral: Paso[]): void {
    const ce = this.celda(p)!;
    if (ce.escarcha === 0 || this.ctx.danadas.has(clave(p))) return;
    this.ctx.danadas.add(clave(p));
    ce.escarcha = (ce.escarcha - 1) as 0 | 1;
    this.puntos += PTS_ESCARCHA;
    lateral.push({ tipo: 'escarcha', pos: p, quedan: ce.escarcha });
  }

  private tocarMancha(p: Pos, lateral: Paso[]): void {
    const ce = this.celda(p)!;
    if (ce.mancha === 0) return;
    ce.mancha = (ce.mancha - 1) as 0 | 1;
    this.puntos += PTS_MANCHA;
    lateral.push({ tipo: 'mancha', pos: p, quedan: ce.mancha });
  }

  /**
   * Quita las fichas de `celdas`: abre candados (la ficha se queda), daña escarchas, baja manchas y
   * encola las detonaciones de los especiales que caigan. Puntos: 60 por celda × cascada
   * (`contar` fuerza cuántas cuentan, p. ej. el match entero aunque el especial se quede).
   */
  private limpiar(pasos: Paso[], celdas: Pos[], sabor: Sabor, contar?: number): void {
    const quitadas: Pos[] = [], ids: number[] = [], lateral: Paso[] = [];
    for (const p of celdas) {
      const ce = this.celda(p);
      if (!ce || !ce.existe) continue;
      const fi = ce.ficha;
      if (!fi) { if (ce.escarcha > 0) this.dañarEscarcha(p, lateral); continue; }
      if (fi.tipo === 'carapina') continue; // las carapinas solo salen por abajo
      if (ce.candado) { ce.candado = false; lateral.push({ tipo: 'candado', pos: p }); continue; }
      ce.ficha = null;
      quitadas.push(p);
      ids.push(fi.id);
      const pedido = fi.tipo === 'bola' ? this.pedidoRestante.find((x) => x.sabor === fi.sabor) : undefined;
      if (pedido && pedido.n > 0) pedido.n--;
      this.tocarMancha(p, lateral);
      if (fi.especial !== 'ninguno') this.ctx.cola.push({ pos: p, ficha: fi });
    }
    if (quitadas.length) {
      const puntos = PTS_BOLA * (contar ?? quitadas.length) * this.ctx.cascada;
      this.puntos += puntos;
      pasos.push({ tipo: 'eliminar', celdas: quitadas, ids, puntos, cascada: this.ctx.cascada, sabor });
    }
    pasos.push(...lateral);
  }

  // ------------------------------------------------------------------ detonaciones

  private existentes(ps: Pos[]): Pos[] {
    const vistos = new Set<string>();
    return ps.filter((p) => {
      if (!this.celda(p)?.existe || vistos.has(clave(p))) return false;
      vistos.add(clave(p));
      return true;
    });
  }
  private fila(f: number): Pos[] { return Array.from({ length: this.cols }, (_, c) => ({ f, c })); }
  private columna(c: number): Pos[] { return Array.from({ length: this.filas }, (_, f) => ({ f, c })); }
  private cuadrado(p: Pos, r: number): Pos[] {
    const l: Pos[] = [];
    for (let f = p.f - r; f <= p.f + r; f++) for (let c = p.c - r; c <= p.c + r; c++) l.push({ f, c });
    return this.existentes(l);
  }
  private bolasDe(sabor: Sabor): Pos[] {
    const l: Pos[] = [];
    this.recorrer((p, ce) => { if (ce.ficha && ce.ficha.tipo === 'bola' && ce.ficha.especial !== 'bolaBolas' && ce.ficha.sabor === sabor) l.push(p); });
    return l;
  }

  /** Detona los especiales encolados; los que caigan en una explosión se encolan y detonan también (cadena). */
  private procesarCola(pasos: Paso[]): void {
    const cola = this.ctx.cola;
    while (cola.length) {
      const { pos, ficha } = cola.shift()!;
      const esp = ficha.especial;
      let celdas: Pos[];
      if (esp === 'rayaH') celdas = this.existentes(this.fila(pos.f));
      else if (esp === 'rayaV') celdas = this.existentes(this.columna(pos.c));
      else if (esp === 'tarrina') { celdas = this.cuadrado(pos, 1); this.pendientes.push({ pos, radio: 1 }); }
      else {
        // Bola Bolas alcanzada por una explosión: se lleva un sabor al azar de los que hay.
        const sabores = [...new Set(this.tablero.flat().flatMap((c) => (c.ficha && c.ficha.tipo === 'bola' && c.ficha.sabor >= 0 ? [c.ficha.sabor] : [])))];
        celdas = sabores.length ? this.bolasDe(this.azar.elegir(sabores)) : [];
      }
      pasos.push({ tipo: 'detonar', pos, especial: esp, celdas });
      this.limpiar(pasos, celdas, -1);
    }
  }

  /** Combos al intercambiar con una bola Bolas o dos especiales. `b` es donde cayó la ficha que movió el jugador. */
  private combinar(pasos: Paso[], a: Pos, b: Pos): void {
    const c = this.ctx;
    const X = this.fichaEn(b)!, Y = this.fichaEn(a)!;
    const bbX = X.especial === 'bolaBolas', bbY = Y.especial === 'bolaBolas';
    if (bbX && bbY) {
      X.especial = Y.especial = 'ninguno'; // ya están «gastadas»: no disparan nada más
      c.combo = 'bb';
      const celdas = this.existentes(this.todasLasCeldas());
      pasos.push({ tipo: 'detonar', pos: b, especial: 'bolaBolas', combo: 'bolaBolas', celdas });
      this.limpiar(pasos, celdas, -1);
    } else if (bbX || bbY) {
      const bb = bbX ? X : Y, bbPos = bbX ? b : a, otro = bbX ? Y : X;
      bb.especial = 'ninguno';
      const conjunto = this.bolasDe(otro.sabor);
      if (otro.especial !== 'ninguno') {
        c.combo = 'dos';
        for (const p of conjunto) {
          const ce = this.celda(p)!;
          if (ce.ficha!.especial !== 'ninguno') continue;
          const esp: Especial = otro.especial === 'tarrina' ? 'tarrina' : this.azar.siguiente() < 0.5 ? 'rayaH' : 'rayaV';
          ce.ficha = { ...ce.ficha!, especial: esp };
          pasos.push({ tipo: 'crearEspecial', pos: p, ficha: copia(ce.ficha) });
        }
      }
      const celdas = [...conjunto, bbPos];
      pasos.push({ tipo: 'detonar', pos: bbPos, especial: 'bolaBolas', ...(otro.especial !== 'ninguno' ? { combo: otro.especial } : {}), celdas });
      this.limpiar(pasos, celdas, -1);
    } else {
      const ea = X.especial, eb = Y.especial;
      X.especial = Y.especial = 'ninguno';
      c.combo = 'dos';
      let celdas: Pos[];
      if (ea === 'tarrina' && eb === 'tarrina') {
        celdas = this.cuadrado(b, 2);
        this.pendientes.push({ pos: b, radio: 2, combo: 'tarrina' });
      } else if (ea === 'tarrina' || eb === 'tarrina') {
        celdas = this.existentes([-1, 0, 1].flatMap((d) => [...this.fila(b.f + d), ...this.columna(b.c + d)]));
      } else {
        celdas = this.existentes([...this.fila(b.f), ...this.columna(b.c)]);
      }
      pasos.push({ tipo: 'detonar', pos: b, especial: ea, combo: eb, celdas });
      this.limpiar(pasos, celdas, -1);
    }
  }

  private todasLasCeldas(): Pos[] { return this.tablero.flatMap((fila, f) => fila.map((_, c) => ({ f, c }))); }

  // ------------------------------------------------------------------ gravedad y relleno

  /** Saca las carapinas que están en una salida. Devuelve cuántas. */
  private salir(pasos: Paso[]): number {
    let n = 0;
    this.recorrer((p, ce) => {
      if (!ce.salida || ce.ficha?.tipo !== 'carapina') return;
      pasos.push({ tipo: 'carapinaFuera', pos: p, id: ce.ficha.id });
      ce.ficha = null;
      this.salidas++;
      this.puntos += PTS_CARAPINA;
      n++;
    });
    return n;
  }

  private caer(pasos: Paso[]): void {
    for (let i = 0; i < 50; i++) {
      const salieron = this.salir(pasos);
      const { movimientos, nuevas } = this.gravedad();
      if (movimientos.length || nuevas.length) pasos.push({ tipo: 'caer', movimientos, nuevas });
      if (!salieron && !movimientos.length && !nuevas.length) break;
    }
  }

  /**
   * Una pasada de gravedad + relleno. Cada columna se parte en tramos por los bloqueos (escarcha, ficha con
   * candado): dentro de un tramo las fichas bajan saltando los huecos; nada cruza un bloqueo (sin caída diagonal
   * en v1). Solo el tramo de arriba, si no hay bloqueo encima, se rellena por arriba.
   */
  private gravedad(): { movimientos: Movimiento[]; nuevas: { ficha: Ficha; hasta: Pos }[] } {
    const movimientos: Movimiento[] = [];
    const nuevas: { ficha: Ficha; hasta: Pos }[] = [];
    const carapinas = this.tablero.flat().filter((c) => c.ficha?.tipo === 'carapina').length;
    // Decide si en esta pasada entra una carapina (de vez en cuando, y nunca más de 2 a la vez).
    let entra = this.porEntrar > 0 && carapinas < 2 && this.azar.siguiente() < 0.35;
    for (let c = 0; c < this.cols; c++) {
      let tramo: Pos[] = [];
      let primero = true;
      const cerrar = () => {
        const fichas = tramo.filter((p) => this.fichaEn(p)).map((p) => this.fichaEn(p)!);
        const vacias = tramo.length - fichas.length;
        const origen = tramo.filter((p) => this.fichaEn(p));
        tramo.forEach((p) => { this.tablero[p.f][p.c].ficha = null; });
        fichas.forEach((fi, i) => {
          const hasta = tramo[vacias + i];
          this.tablero[hasta.f][hasta.c].ficha = fi;
          if (!igual(origen[i], hasta)) movimientos.push({ id: fi.id, desde: origen[i], hasta });
        });
        if (primero) {
          // La de más abajo entra primero (desde f = -1), la siguiente desde -2…; la carapina, si toca, es la de más arriba.
          for (let j = 0; j < vacias; j++) {
            const hasta = tramo[vacias - 1 - j];
            let ficha: Ficha;
            if (entra && j === vacias - 1) { ficha = this.nuevaFicha('carapina', -1); entra = false; this.porEntrar--; }
            else ficha = this.nuevaFicha('bola', this.saborRelleno());
            this.tablero[hasta.f][hasta.c].ficha = ficha;
            nuevas.push({ ficha: copia(ficha), hasta });
          }
        }
        tramo = [];
      };
      for (let f = 0; f < this.filas; f++) {
        const ce = this.tablero[f][c];
        if (!ce.existe) continue;
        if (ce.escarcha > 0 || (ce.ficha && ce.candado)) { cerrar(); primero = false; } else tramo.push({ f, c });
      }
      cerrar();
    }
    return { movimientos, nuevas };
  }

  // ------------------------------------------------------------------ fin de nivel

  private objetivoCumplido(): boolean {
    const o = this.nivel.objetivo;
    if (o.tipo === 'puntos') return true;
    if (o.tipo === 'manchas') return this.tablero.flat().every((c) => c.mancha === 0);
    if (o.tipo === 'carapinas') return this.salidas >= o.n;
    return this.pedidoRestante.every((x) => x.n <= 0);
  }

  private nivelJaleo(cascada: number): 0 | 1 | 2 | 3 | 4 {
    const combo = this.ctx.combo;
    if (combo === 'bb' || cascada >= 6) return 4;
    if (cascada >= 4 || combo) return 3;
    if (cascada >= 3) return 2;
    return cascada >= 2 || this.ctx.creoEspecial ? 1 : 0;
  }

  /** ¡BOLAZO!: cada movimiento sobrante convierte una bola al azar en raya; todas se detonan con sus puntos. */
  private bolazo(pasos: Paso[]): void {
    const candidatas: Pos[] = [];
    this.recorrer((p, ce) => { if (ce.ficha && ce.ficha.tipo === 'bola' && ce.ficha.especial === 'ninguno' && !ce.candado) candidatas.push(p); });
    const elegidas = this.azar.barajar(candidatas).slice(0, this.movimientosRestantes);
    this.ctx = { cascada: 0, cola: [], danadas: new Set(), creoEspecial: false, combo: null };
    this.ciclo(pasos, [], () => {
      for (const p of elegidas) {
        const ce = this.celda(p)!;
        ce.ficha = { ...ce.ficha!, especial: this.azar.siguiente() < 0.5 ? 'rayaH' : 'rayaV' };
        pasos.push({ tipo: 'crearEspecial', pos: p, ficha: copia(ce.ficha) });
      }
      this.limpiar(pasos, elegidas, -1); // las quita y encola sus detonaciones
    });
  }
}
