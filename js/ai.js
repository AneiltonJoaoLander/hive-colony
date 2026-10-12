'use strict';
/* IA simples: heurística de pressão sobre as rainhas + busca limitada */

const Q_WEIGHT = [0, 4, 11, 24, 46, 95, 100000];

function evaluate(s, me) {
  if (s.winner !== null) {
    if (s.winner === 'draw') return 0;
    return s.winner === me ? 100000 : -100000;
  }
  let v = 0;
  for (const c of [0, 1]) {
    const n = queenPressure(s, c);
    if (n < 0) { v += (c === me ? -6 : 6); continue; }
    v += (c === me ? -1.15 : 1) * Q_WEIGHT[n];
  }
  const myQ = s.pieces[s.queens[me]], opQ = s.pieces[s.queens[1 - me]];
  for (const k in s.board) {
    const st = s.board[k];
    const top = s.pieces[st[st.length - 1]];
    for (let i = 0; i < st.length - 1; i++) {          // peças cobertas
      const p = s.pieces[st[i]];
      if (p.color === me) v -= 5; else if (p.color !== 2) v += 5;
    }
    if (top.color === 2) continue;
    if (top.color === me) {
      v += 3;
      if (opQ.loc === 'board') { const d = hexDist(k, opQ.cell); if (d <= 2) v += 3 - d; }
    } else {
      v -= 3;
      if (myQ.loc === 'board') { const d = hexDist(k, myQ.cell); if (d <= 2) v -= 3 - d; }
    }
  }
  for (const id of s.hands[me]) if (s.pieces[id].color === me) v += 0.5;
  return v;
}

function search(s, depth, me, alpha, beta, beam) {
  if (s.winner !== null || depth === 0) return evaluate(s, me);
  const acts = allActions(s, { dedupe: true });
  const maxing = s.turn === me;
  const scored = acts.map(a => { const ns = applyAction(s, a); return { ns, v: evaluate(ns, me) }; });
  scored.sort((x, y) => maxing ? y.v - x.v : x.v - y.v);
  const lim = scored.slice(0, beam);
  let best = maxing ? -Infinity : Infinity;
  for (const e of lim) {
    const v = (e.ns.winner !== null || depth === 1) ? e.v : search(e.ns, depth - 1, me, alpha, beta, Math.max(4, beam - 3));
    if (maxing) { if (v > best) best = v; if (best > alpha) alpha = best; }
    else { if (v < best) best = v; if (best < beta) beta = best; }
    if (alpha >= beta) break;
  }
  return best;
}

function aiChoose(s, level) {
  const acts = allActions(s, { dedupe: true });
  if (acts.length === 1) return acts[0];
  const me = s.turn;
  const scored = acts.map(a => ({ a, ns: applyAction(s, a) }));
  for (const e of scored) {
    e.v1 = evaluate(e.ns, me);
    if (e.ns.winner === me) return e.a;
  }
  if (level === 'easy') {
    if (Math.random() < 0.65) return acts[Math.floor(Math.random() * acts.length)];
    scored.sort((x, y) => y.v1 - x.v1);
    return scored[Math.floor(Math.random() * Math.min(4, scored.length))].a;
  }
  if (level === 'medium') {
    for (const e of scored) e.v = e.v1 + Math.random() * 4;
    scored.sort((x, y) => y.v - x.v);
    return scored[0].a;
  }
  // difícil: beam search (minha jogada, resposta, minha jogada)
  scored.sort((x, y) => y.v1 - x.v1);
  const root = scored.slice(0, 9);
  let best = null, bestV = -Infinity;
  for (const e of root) {
    let v;
    if (e.ns.winner !== null) v = e.v1;
    else v = search(e.ns, 2, me, -Infinity, Infinity, 7);
    v += Math.random() * 0.8;
    if (v > bestV) { bestV = v; best = e.a; }
  }
  return best || scored[0].a;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { aiChoose, evaluate };
