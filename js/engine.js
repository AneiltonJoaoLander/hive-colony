'use strict';
/* =====================================================================
   HIVE + HIVE COLONY - motor de regras
   Tabuleiro hexagonal em coordenadas axiais (q,r). Cada casa guarda uma
   pilha (array de ids; o último é o topo).
   ===================================================================== */

const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const NB_CACHE = Object.create(null);
function key(q, r) { return q + ',' + r; }
function unkey(k) { const i = k.indexOf(','); return [+k.slice(0, i), +k.slice(i + 1)]; }
function neighbors(k) {
  let n = NB_CACHE[k];
  if (!n) { const [q, r] = unkey(k); n = DIRS.map(d => key(q + d[0], r + d[1])); NB_CACHE[k] = n; }
  return n;
}
function hexDist(a, b) {
  const [q1, r1] = unkey(a), [q2, r2] = unkey(b);
  const dq = q1 - q2, dr = r1 - r2;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/* ---------------- Catálogo de peças ---------------- */
const TYPES = {
  queen:       { name: 'Rainha Abelha',     color: '#f5b800', desc: 'Move 1 casa deslizando ao redor da colmeia. Se ficar completamente cercada, o dono dela perde.' },
  beetle:      { name: 'Besouro',           color: '#9b51e0', desc: 'Move 1 casa. Pode subir em cima de outras peças (prendendo a de baixo), andar por cima da colmeia e descer.' },
  grasshopper: { name: 'Gafanhoto',         color: '#34a853', desc: 'Salta em linha reta por cima de uma ou mais peças e cai na primeira casa vazia depois delas.' },
  spider:      { name: 'Aranha',            color: '#a0643a', desc: 'Desliza exatamente 3 casas ao redor da colmeia, sem passar duas vezes pela mesma casa.' },
  ant:         { name: 'Formiga',           color: '#2f80ed', desc: 'Desliza qualquer número de casas ao redor da colmeia.' },
  mosquito:    { name: 'Mosquito',          color: '#8a9199', desc: 'Copia o movimento (e os poderes) de qualquer peça vizinha. Em cima da colmeia, move-se como Besouro.' },
  ladybug:     { name: 'Joaninha',          color: '#e53935', desc: 'Move exatamente 3 casas: duas por cima da colmeia e a terceira desce para o chão.' },
  pillbug:     { name: 'Tatuzinho',         color: '#14a7a0', desc: 'Move 1 casa, OU arremessa uma peça solta vizinha por cima de si para outra casa vazia vizinha dele (não vale a peça que o adversário acabou de mover).' },
  wasp:        { name: 'Vespa Rainha',      color: '#ff8f00', desc: 'Verso da Rainha. Move 1 casa, OU ferroa um inseto inimigo vizinho (que esteja sozinho na casa): ele vira e fica paralisado por 1 turno. Não pode ferroar a peça que o adversário acabou de colocar, mover ou virar.' },
  firefly:     { name: 'Vaga-lume',         color: '#b8d62a', desc: 'No chão, sobe 2 casas por cima da colmeia. Em cima, anda 1 casa por vez até descer. Não anda pelo chão.' },
  dragonfly:   { name: 'Libélula',          color: '#18b4e0', desc: 'No chão, sobe 1 casa. Em cima da colmeia, voa em linha reta por cima das peças até pousar na primeira casa vazia.' },
  scorpion:    { name: 'Escorpião',         color: '#b5552c', desc: 'Desliza exatamente 2 casas. Suprime os insetos inimigos vizinhos: eles não podem ser virados (exceto o Percevejo-escudo).' },
  fly:         { name: 'Mosca',             color: '#6b7f94', desc: 'Voa até a peça que o adversário colocou, moveu ou virou no último turno e desce para uma casa vazia ao lado dela.' },
  centipede:   { name: 'Centopeia',         color: '#d35400', desc: 'Anda 3 casas por cima das peças e troca de lugar com a peça solta onde terminar.' },
  shieldbug:   { name: 'Percevejo-escudo',  color: '#1f9d6a', desc: 'Move 2 casas: sobe 1 e desce 1. Protege a si e as peças vizinhas contra poderes (ferroada, controle, eliminação, arremesso, troca).' },
  tick:        { name: 'Carrapato',         color: '#8d6e63', desc: 'Sobe 1 casa na colmeia ou desce 1 (não anda por cima). Controle mental: move uma peça inimiga vizinha, do mesmo nível, como se fosse sua.' },
  mantis:      { name: 'Louva-a-deus',      color: '#7cb342', desc: 'Não anda. Voa até a peça que o adversário colocou no último turno: as duas são eliminadas para sempre.' },
  assassin:    { name: 'Percevejo Assassino', color: '#e91e63', desc: 'Move 1 casa, OU ataca uma peça inimiga vizinha que esteja sozinha: as duas são eliminadas. Não pode atacar a peça que o adversário acabou de mover ou virar.' },
  butterfly:   { name: 'Borboleta',         color: '#ff6fb5', desc: 'Guardiã. Só anda por cima da colmeia: 2 casas, sem poder descer. Só pode ser colocada em cima de uma peça sua.' },
  moth:        { name: 'Mariposa',          color: '#c8a97e', desc: 'Guardiã. Desce 1 casa até o chão e sobe 1 casa de volta para cima da colmeia. Só pode ser colocada em cima de uma peça sua.' },
  combo:       { name: 'Honeycombo',        color: '#f5c542', desc: 'Peça neutra compartilhada. Quem tem a sua cor virada para cima pode gastar o turno virando-a para jogar 2 vezes no próximo turno. Não pode ser movida, eliminada nem coberta.' }
};

/* Verso (Venom) de cada peça original — pareamento adotado neste jogo */
const VENOM_BACK = {
  queen: 'wasp', beetle: 'firefly', ant: 'fly', grasshopper: 'dragonfly',
  spider: 'scorpion', mosquito: 'tick', ladybug: 'shieldbug', pillbug: 'centipede'
};

/* ---------------- Estado ---------------- */
function ptype(p) { return p.face && p.back ? p.back : p.front; }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function defaultConfig() {
  return { mode: 'original', mosquito: false, ladybug: false, pillbug: false, venom: false, swarm: false, predators: false, guardians: false, honeycombo: false };
}

function newGame(cfg) {
  const s = {
    cfg: Object.assign(defaultConfig(), cfg),
    pieces: {}, board: {}, hands: [[], []], bag: [], queens: [null, null],
    turn: 0, actionsLeft: 1, ply: 0, placed: [0, 0], lastBy: [null, null],
    combo: null, pendingDouble: [false, false], winner: null
  };
  const c = s.cfg;
  const counts = [['queen', 1], ['beetle', 2], ['spider', 2], ['grasshopper', 3], ['ant', 3]];
  if (c.mosquito) counts.push(['mosquito', 1]);
  if (c.ladybug) counts.push(['ladybug', 1]);
  if (c.pillbug) counts.push(['pillbug', 1]);
  if (c.predators) counts.push(['mantis', 1], ['assassin', 1]);
  if (c.guardians) counts.push(['butterfly', 1], ['moth', 1]);
  for (let color = 0; color < 2; color++) {
    for (const [t, n] of counts) {
      for (let i = 1; i <= n; i++) {
        const id = `${color}_${t}_${i}`;
        const back = c.venom ? (VENOM_BACK[t] || null) : null;
        s.pieces[id] = { id, color, front: t, back, face: 0, frozen: 0, loc: 'hand', cell: null };
        if (t === 'queen') s.queens[color] = id;
      }
    }
  }
  if (c.swarm) {
    for (let color = 0; color < 2; color++) {
      const own = Object.values(s.pieces).filter(p => p.color === color && p.front !== 'queen').map(p => p.id);
      shuffle(own);
      s.hands[color] = [s.queens[color], ...own.slice(0, 3)];
      s.bag.push(...own.slice(3));
    }
    shuffle(s.bag);
    for (const id of s.hands[0].concat(s.hands[1])) s.pieces[id].loc = 'hand';
    for (const id of s.bag) s.pieces[id].loc = 'bag';
  } else {
    for (const p of Object.values(s.pieces)) s.hands[p.color].push(p.id);
  }
  if (c.honeycombo) {
    s.pieces.HC = { id: 'HC', color: 2, front: 'combo', back: null, face: 0, frozen: 0, loc: 'board', cell: '0,0' };
    s.board['0,0'] = ['HC'];
    s.combo = { face: 1, lockedFor: null };
  }
  return s;
}

function cloneState(s) {
  const n = Object.assign({}, s);
  n.pieces = {};
  for (const id in s.pieces) n.pieces[id] = Object.assign({}, s.pieces[id]);
  n.board = {};
  for (const k in s.board) n.board[k] = s.board[k].slice();
  n.hands = [s.hands[0].slice(), s.hands[1].slice()];
  n.bag = s.bag.slice();
  n.placed = s.placed.slice();
  n.lastBy = s.lastBy.slice();
  n.pendingDouble = s.pendingDouble.slice();
  if (s.combo) n.combo = Object.assign({}, s.combo);
  return n;
}

/* ---------------- Utilidades de tabuleiro ---------------- */
function topId(s, k) { const st = s.board[k]; return st && st.length ? st[st.length - 1] : null; }
function topPiece(s, k) { const id = topId(s, k); return id ? s.pieces[id] : null; }
function hgt(B, k) { const st = B[k]; return st ? st.length : 0; }
function hasNeutral(B, k) { const st = B[k]; return !!st && st[0] === 'HC'; }
function boardWithout(board, k) {
  const B = Object.assign({}, board);
  const st = board[k].slice(0, board[k].length - 1);
  if (st.length) B[k] = st; else delete B[k];
  return B;
}
function connected(B) {
  const keys = Object.keys(B);
  if (keys.length <= 1) return true;
  const seen = new Set([keys[0]]);
  const stack = [keys[0]];
  while (stack.length) {
    const c = stack.pop();
    for (const n of neighbors(c)) if (B[n] && !seen.has(n)) { seen.add(n); stack.push(n); }
  }
  return seen.size === keys.length;
}
/* Pode deslizar de a para b? (B já sem a peça que se move; fH/tH = nível de partida/chegada) */
function slideOk(B, a, b, fH, tH) {
  const nb = neighbors(a);
  const i = nb.indexOf(b);
  const g1 = hgt(B, nb[(i + 5) % 6]), g2 = hgt(B, nb[(i + 1) % 6]);
  if (fH === 0 && tH === 0) return (g1 > 0) !== (g2 > 0);
  return Math.min(g1, g2) <= Math.max(fH, tH);
}
function queenPlaced(s, c) { return s.pieces[s.queens[c]].loc === 'board'; }

function isShielded(s, k) {
  const p = topPiece(s, k);
  if (p && ptype(p) === 'shieldbug') return true;
  for (const n of neighbors(k)) {
    const q = topPiece(s, n);
    if (q && ptype(q) === 'shieldbug' && !q.frozen) return true;
  }
  return false;
}
function flipSuppressed(s, k) {
  const p = topPiece(s, k);
  if (!p || ptype(p) === 'shieldbug') return false;
  for (const n of neighbors(k)) {
    const q = topPiece(s, n);
    if (q && ptype(q) === 'scorpion' && q.color !== p.color && !q.frozen) return true;
  }
  return false;
}
function touchedByOpp(s, actor, id, kinds) {
  const l = s.lastBy[1 - actor];
  return !!l && l.ids.includes(id) && (!kinds || kinds.includes(l.kind));
}
function removeTops(board, cells) {
  let B = board;
  for (const k of cells) B = boardWithout(B, k);
  return B;
}

/* ---------------- Geração de ações ---------------- */
function walk(ctx, pattern) {
  const { B, k } = ctx;
  const res = new Set();
  const dfs = (cur, i, vis) => {
    if (i === pattern.length) { res.add(cur); return; }
    const ch = hgt(B, cur);
    for (const b of neighbors(cur)) {
      if (vis.has(b)) continue;
      const th = hgt(B, b);
      const pt = pattern[i];
      if (pt === 'occ' && th === 0) continue;
      if (pt === 'empty' && th !== 0) continue;
      if (!slideOk(B, cur, b, ch, th)) continue;
      vis.add(b); dfs(b, i + 1, vis); vis.delete(b);
    }
  };
  dfs(k, 0, new Set([k]));
  return [...res].filter(c => !hasNeutral(B, c));
}
function antReach(ctx) {
  const { B, k } = ctx;
  const seen = new Set([k]);
  const q = [k];
  while (q.length) {
    const cur = q.pop();
    for (const b of neighbors(cur)) {
      if (seen.has(b) || hgt(B, b) > 0) continue;
      if (!slideOk(B, cur, b, 0, 0)) continue;
      seen.add(b); q.push(b);
    }
  }
  seen.delete(k);
  return [...seen];
}
function jumpTargets(ctx) {
  const { B, k } = ctx;
  const res = [];
  for (let i = 0; i < 6; i++) {
    let c = neighbors(k)[i];
    if (!B[c]) continue;
    while (B[c]) c = neighbors(c)[i];
    res.push(c);
  }
  return res;
}
function addMoves(ctx, cells, extra) {
  for (const c of cells) ctx.out.push(Object.assign({ type: 'move', pid: ctx.p.id, from: ctx.k, to: c, steps: [c], label: 'Mover' }, extra));
}

function genSting(ctx) {
  const { s, k, actor } = ctx;
  for (const x of neighbors(k)) {
    const st = s.board[x];
    if (!st || st.length !== 1) continue;
    const t = s.pieces[st[0]];
    if (t.color === 2 || t.color === actor || !t.back) continue;
    if (isShielded(s, x)) continue;
    if (touchedByOpp(s, actor, t.id)) continue;
    ctx.out.push({ type: 'sting', pid: ctx.p.id, from: k, target: x, steps: [x], label: 'Ferroar' });
  }
}
function genThrow(ctx) {
  const { s, k, actor } = ctx;
  if (hgt(s.board, k) !== 1) return;
  for (const x of neighbors(k)) {
    const st = s.board[x];
    if (!st || st.length !== 1) continue;
    const t = s.pieces[st[0]];
    if (t.color === 2) continue;
    if (touchedByOpp(s, actor, t.id)) continue;
    if (isShielded(s, x)) continue;
    const B2 = boardWithout(s.board, x);
    if (!connected(B2)) continue;
    if (!slideOk(B2, x, k, 0, 1)) continue;
    for (const y of neighbors(k)) {
      if (y === x || B2[y]) continue;
      if (!slideOk(B2, k, y, 1, 0)) continue;
      ctx.out.push({ type: 'throw', pid: ctx.p.id, from: k, target: x, to: y, steps: [x, y], label: 'Arremessar peça' });
    }
  }
}
function genAssassinRemove(ctx) {
  const { s, k, actor } = ctx;
  for (const x of neighbors(k)) {
    const st = s.board[x];
    if (!st || st.length !== 1) continue;
    const t = s.pieces[st[0]];
    if (t.color === 2 || t.color === actor) continue;
    if (isShielded(s, x)) continue;
    if (touchedByOpp(s, actor, t.id, ['move', 'flip'])) continue;
    if (!connected(removeTops(s.board, [k, x]))) continue;
    ctx.out.push({ type: 'remove', pid: ctx.p.id, from: k, target: x, steps: [x], label: 'Eliminar' });
  }
}
function genMantis(ctx) {
  const { s, k, actor } = ctx;
  const l = s.lastBy[1 - actor];
  if (!l || l.kind !== 'place' || !l.ids.length) return;
  const t = s.pieces[l.ids[0]];
  if (!t || t.loc !== 'board' || t.color === actor) return;
  const x = t.cell;
  if (topId(s, x) !== t.id || x === k) return;
  if (isShielded(s, x)) return;
  if (!connected(removeTops(s.board, [k, x]))) return;
  ctx.out.push({ type: 'remove', pid: ctx.p.id, from: k, target: x, steps: [x], label: 'Voar e eliminar' });
}
function genCentipede(ctx) {
  const { s, B, k } = ctx;
  if (ctx.fH !== 0) return;
  const ends = new Set();
  const dfs = (cur, depth, vis) => {
    if (depth === 3) {
      if (B[cur].length === 1 && !hasNeutral(B, cur) && !isShielded(s, cur)) ends.add(cur);
      return;
    }
    for (const b of neighbors(cur)) {
      if (!B[b] || vis.has(b)) continue;
      vis.add(b); dfs(b, depth + 1, vis); vis.delete(b);
    }
  };
  dfs(k, 0, new Set([k]));
  for (const e of ends) ctx.out.push({ type: 'move', pid: ctx.p.id, from: k, to: e, swap: true, steps: [e], label: 'Trocar de lugar' });
}
function genFly(ctx) {
  const { s, B, k, actor } = ctx;
  const l = s.lastBy[1 - actor];
  if (!l) return;
  const seen = new Set();
  for (const id of l.ids) {
    const t = s.pieces[id];
    if (!t || t.loc !== 'board' || t.id === ctx.p.id || t.color === 2) continue;
    for (const y of neighbors(t.cell)) {
      if (B[y] || y === k || seen.has(y)) continue;
      seen.add(y);
      ctx.out.push({ type: 'move', pid: ctx.p.id, from: k, to: y, steps: [y], label: 'Voar' });
    }
  }
}
function genControl(ctx) {
  if (ctx.noControl) return;
  const { s, k, actor } = ctx;
  const level = s.board[k].length - 1;
  for (const x of neighbors(k)) {
    const st = s.board[x];
    if (!st || st.length - 1 !== level) continue;
    const e = s.pieces[st[st.length - 1]];
    if (e.color === 2 || e.color === actor || ptype(e) === 'tick' || e.frozen) continue;
    if (isShielded(s, x)) continue;
    const inner = pieceActions(s, x, actor, { ctrl: true, noControl: true });
    for (const ia of inner) {
      ctx.out.push({ type: 'control', pid: ctx.p.id, from: k, target: x, inner: ia, steps: [x].concat(ia.steps), label: 'Controle mental' });
    }
  }
}

function genType(ctx, t, mim) {
  const { s, k, fH } = ctx;
  const cm = ctx.canMove;
  switch (t) {
    case 'queen': if (cm) addMoves(ctx, walk(ctx, ['empty'])); break;
    case 'wasp': if (cm) addMoves(ctx, walk(ctx, ['empty'])); genSting(ctx); break;
    case 'beetle': if (cm) addMoves(ctx, walk(ctx, ['any'])); break;
    case 'grasshopper': if (cm) addMoves(ctx, jumpTargets(ctx)); break;
    case 'spider': if (cm) addMoves(ctx, walk(ctx, ['empty', 'empty', 'empty'])); break;
    case 'scorpion': if (cm) addMoves(ctx, walk(ctx, ['empty', 'empty'])); break;
    case 'ant': if (cm) addMoves(ctx, antReach(ctx)); break;
    case 'ladybug': if (cm) addMoves(ctx, walk(ctx, ['occ', 'occ', 'empty'])); break;
    case 'shieldbug': if (cm) addMoves(ctx, walk(ctx, ['occ', 'empty'])); break;
    case 'butterfly': if (cm && fH > 0) addMoves(ctx, walk(ctx, ['occ', 'occ'])); break;
    case 'moth': if (cm && fH > 0) addMoves(ctx, walk(ctx, ['empty', 'occ'])); break;
    case 'firefly': if (cm) addMoves(ctx, fH === 0 ? walk(ctx, ['occ', 'occ']) : walk(ctx, ['any'])); break;
    case 'tick':
      if (cm) addMoves(ctx, fH === 0 ? walk(ctx, ['occ']) : walk(ctx, ['empty']));
      genControl(ctx);
      break;
    case 'dragonfly':
      if (cm) addMoves(ctx, fH === 0 ? walk(ctx, ['occ']) : jumpTargets(ctx));
      break;
    case 'pillbug':
      if (cm) addMoves(ctx, walk(ctx, ['empty']));
      genThrow(ctx);
      break;
    case 'centipede': if (cm) genCentipede(ctx); break;
    case 'fly': if (cm) genFly(ctx); break;
    case 'mantis': genMantis(ctx); break;
    case 'assassin':
      if (cm) addMoves(ctx, walk(ctx, ['empty']));
      genAssassinRemove(ctx);
      break;
    case 'mosquito': {
      if (mim) break;
      if (fH > 0) {
        genType(ctx, 'beetle', true);
        if (s.cfg.guardians) {
          const seen = new Set();
          for (const n of neighbors(k)) {
            const q = topPiece(s, n);
            if (!q) continue;
            const qt = ptype(q);
            if ((qt === 'butterfly' || qt === 'moth') && !seen.has(qt)) { seen.add(qt); genType(ctx, qt, true); }
          }
        }
        break;
      }
      const seen = new Set();
      for (const n of neighbors(k)) {
        const q = topPiece(s, n);
        if (!q || q.color === 2) continue;
        const qt = ptype(q);
        if (qt === 'mosquito' || qt === 'butterfly' || qt === 'moth' || seen.has(qt)) continue;
        seen.add(qt);
        genType(ctx, qt, true);
      }
      break;
    }
  }
}

function pieceActions(s, k, actor, opts) {
  opts = opts || {};
  const st = s.board[k];
  if (!st) return [];
  const p = s.pieces[st[st.length - 1]];
  if (p.color === 2) return [];
  if (!opts.ctrl && p.color !== actor) return [];
  if (p.frozen > 0) return [];
  if (!queenPlaced(s, actor)) return [];
  const B = boardWithout(s.board, k);
  const fH = hgt(B, k);
  const ctx = { s, k, p, actor, B, fH, out: [], noControl: !!opts.noControl, canMove: fH > 0 || connected(B) };
  genType(ctx, ptype(p), false);
  // remove duplicatas (ex.: mosquito copiando vizinhos iguais)
  const seen = new Set();
  const res = [];
  for (const a of ctx.out) {
    const sig = a.type + '|' + a.steps.join(';') + '|' + (a.inner ? a.inner.type : '');
    if (seen.has(sig)) continue;
    seen.add(sig);
    res.push(a);
  }
  return res;
}

function flipActionFor(s, k, actor) {
  if (!s.cfg.venom) return null;
  const p = topPiece(s, k);
  if (!p || p.color !== actor || !p.back || p.frozen > 0) return null;
  if (!queenPlaced(s, actor)) return null;
  if (touchedByOpp(s, actor, p.id, ['move'])) return null;
  if (flipSuppressed(s, k)) return null;
  return { type: 'flip', pid: p.id, from: k, steps: [], label: 'Virar peça' };
}

function placementCells(s, p) {
  const board = s.board;
  const keys = Object.keys(board);
  if (keys.length === 0) return ['0,0'];
  const t = p.front;
  if (t === 'butterfly' || t === 'moth') {
    const res = [];
    for (const k of keys) {
      if (board[k][0] === 'HC') continue;
      const tp = topPiece(s, k);
      if (tp.color !== p.color) continue;
      let ok = true;
      for (const n of neighbors(k)) { const q = topPiece(s, n); if (q && q.color !== p.color && q.color !== 2) { ok = false; break; } }
      if (ok) res.push(k);
    }
    return res;
  }
  let count = 0;
  for (const k of keys) if (board[k][0] !== 'HC') count += board[k].length;
  const free = count < 2;
  const cand = new Set();
  for (const k of keys) for (const n of neighbors(k)) if (!board[n]) cand.add(n);
  const res = [];
  for (const c of cand) {
    if (!free) {
      let ok = true;
      for (const n of neighbors(c)) { const q = topPiece(s, n); if (q && q.color !== p.color && q.color !== 2) { ok = false; break; } }
      if (!ok) continue;
    }
    res.push(c);
  }
  return res;
}

function allActions(s, opts) {
  opts = opts || {};
  const acts = [];
  if (s.winner !== null) return acts;
  const actor = s.turn;
  const forceQueen = s.placed[actor] >= 3 && !queenPlaced(s, actor);
  const seen = new Set();
  for (const pid of s.hands[actor]) {
    const p = s.pieces[pid];
    if (forceQueen && pid !== s.queens[actor]) continue;
    if (opts.dedupe) { const sig = p.color + p.front; if (seen.has(sig)) continue; seen.add(sig); }
    const faces = (s.cfg.venom && p.back && p.front !== 'queen') ? [0, 1] : [0];
    for (const c of placementCells(s, p)) {
      for (const f of faces) acts.push({ type: 'place', pid, to: c, face: f, steps: [c], src: 'hand:' + pid, label: 'Colocar' });
    }
  }
  if (queenPlaced(s, actor)) {
    for (const k of Object.keys(s.board)) {
      const p = topPiece(s, k);
      if (p.color !== actor) continue;
      for (const a of pieceActions(s, k, actor)) { a.src = k; acts.push(a); }
      const f = flipActionFor(s, k, actor);
      if (f) { f.src = k; acts.push(f); }
    }
    if (s.combo && s.combo.face === actor && s.combo.lockedFor !== actor) {
      acts.push({ type: 'flipcombo', steps: [], src: 'combo', label: 'Virar Honeycombo' });
    }
    if (s.cfg.swarm) {
      if (s.bag.length) acts.push({ type: 'draw', steps: [], src: 'bag', label: 'Comprar do saco' });
      for (const pid of s.hands[1 - actor]) {
        if (s.pieces[pid].color === actor) acts.push({ type: 'steal', pid, steps: [], src: 'steal:' + pid, label: 'Roubar peça' });
      }
    }
  }
  if (!acts.length) acts.push({ type: 'pass', steps: [], src: 'pass', label: 'Passar' });
  return acts;
}

/* ---------------- Aplicar ações ---------------- */
function putOn(s, id, k) {
  if (!s.board[k]) s.board[k] = [];
  s.board[k].push(id);
  const p = s.pieces[id];
  p.loc = 'board'; p.cell = k;
}
function lift(s, k) {
  const st = s.board[k];
  const id = st.pop();
  if (!st.length) delete s.board[k];
  s.pieces[id].cell = null;
  return id;
}
function dropFromHands(s, id) {
  for (const h of s.hands) { const i = h.indexOf(id); if (i >= 0) { h.splice(i, 1); return; } }
}

function applyCore(s, a, info) {
  switch (a.type) {
    case 'move': {
      const id = lift(s, a.from);
      if (a.swap) {
        const id2 = lift(s, a.to);
        putOn(s, id, a.to); putOn(s, id2, a.from);
        info.ids = [id, id2];
      } else { putOn(s, id, a.to); info.ids = [id]; }
      info.kind = 'move';
      break;
    }
    case 'throw': {
      const id = lift(s, a.target);
      putOn(s, id, a.to);
      info.kind = 'move'; info.ids = [id];
      break;
    }
    case 'sting': {
      const t = topPiece(s, a.target);
      t.face = t.face ? 0 : 1; t.frozen = 1;
      info.kind = 'flip'; info.ids = [t.id];
      break;
    }
    case 'remove': {
      const i1 = lift(s, a.from), i2 = lift(s, a.target);
      for (const id of [i1, i2]) { s.pieces[id].loc = 'removed'; s.pieces[id].cell = null; }
      info.kind = 'remove'; info.ids = [];
      break;
    }
    case 'control': applyCore(s, a.inner, info); break;
    case 'flip': {
      const p = s.pieces[a.pid];
      p.face = p.face ? 0 : 1;
      info.kind = 'flip'; info.ids = [p.id];
      break;
    }
  }
}

function drawFromBag(s, actor) {
  if (!s.bag.length) return null;
  const id = s.bag.pop();
  s.hands[actor].push(id);
  s.pieces[id].loc = 'hand';
  return id;
}

function computeWinner(s) {
  const lost = [false, false];
  for (const c of [0, 1]) {
    const q = s.pieces[s.queens[c]];
    if (q.loc === 'removed') { lost[c] = true; continue; }
    if (q.loc === 'board') {
      const k = q.cell;
      if (neighbors(k).every(n => s.board[n])) {
        if (!s.cfg.guardians || topId(s, k) !== q.id) lost[c] = true;
      }
    }
  }
  if (lost[0] && lost[1]) return 'draw';
  if (lost[0]) return 1;
  if (lost[1]) return 0;
  return null;
}

function applyAction(s0, a) {
  const s = cloneState(s0);
  const actor = s.turn;
  const info = { kind: a.type, ids: [] };
  switch (a.type) {
    case 'place': {
      const p = s.pieces[a.pid];
      dropFromHands(s, p.id);
      p.face = a.face || 0;
      putOn(s, p.id, a.to);
      s.placed[actor]++;
      info.kind = 'place'; info.ids = [p.id];
      if (s.cfg.swarm) drawFromBag(s, actor);
      break;
    }
    case 'draw': drawFromBag(s, actor); break;
    case 'steal': {
      dropFromHands(s, a.pid);
      s.hands[actor].push(a.pid);
      break;
    }
    case 'flipcombo': {
      s.combo.face = 1 - actor;
      s.combo.lockedFor = 1 - actor;
      s.pendingDouble[actor] = true;
      info.kind = 'flip'; info.ids = ['HC'];
      break;
    }
    case 'pass': break;
    default: applyCore(s, a, info);
  }
  s.lastBy[actor] = info;
  s.winner = computeWinner(s);
  if (s.winner !== null) { s.actionsLeft = 0; return s; }
  s.actionsLeft--;
  if (s.actionsLeft <= 0) {
    for (const id in s.pieces) { const p = s.pieces[id]; if (p.color === actor && p.frozen > 0) p.frozen--; }
    if (s.combo && s.combo.lockedFor === actor) s.combo.lockedFor = null;
    const nxt = 1 - actor;
    s.turn = nxt;
    s.actionsLeft = s.pendingDouble[nxt] ? 2 : 1;
    s.pendingDouble[nxt] = false;
    s.ply++;
  }
  return s;
}

/* Nº de vizinhos ocupados da rainha de cor c (ou -1 se fora do tabuleiro) */
function queenPressure(s, c) {
  const q = s.pieces[s.queens[c]];
  if (q.loc !== 'board') return -1;
  let n = 0;
  for (const nb of neighbors(q.cell)) if (s.board[nb]) n++;
  return n;
}

/* Exporta para Node (testes) */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { newGame, allActions, applyAction, cloneState, connected, neighbors, queenPressure, ptype, TYPES, hgt, topPiece, computeWinner };
}
