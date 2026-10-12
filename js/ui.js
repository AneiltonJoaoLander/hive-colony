'use strict';
/* Interface: tabuleiro SVG, mãos, destaques de jogadas, histórico, IA */

const R = 40, SQ3 = Math.sqrt(3);
const $ = id => document.getElementById(id);
const WHO = ['Brancas', 'Pretas'];

const _hexCache = {};
function hexPts(r) {
  const k = r.toFixed(2);
  if (_hexCache[k]) return _hexCache[k];
  let s = '';
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    s += (r * Math.cos(a)).toFixed(2) + ',' + (r * Math.sin(a)).toFixed(2) + ' ';
  }
  return (_hexCache[k] = s.trim());
}
function cellXY(k) { const [q, r] = unkey(k); return [R * SQ3 * (q + r / 2), R * 1.5 * r]; }

const App = {
  state: null, history: [], log: [], players: [{ ai: false }, { ai: false }], bottom: 0,
  sel: null, steps: [], cands: [], acts: [], infoPiece: null, hoverPiece: null,
  lastMove: null, view: { tx: 0, ty: 0, k: 1, auto: true }, busy: false, gameId: 0, ended: false,
  clock: null,      // { base, inc, ms:[a,b], running, last }
  result: null,     // { winner, reason } quando termina por tempo / desistência
  online: null      // { mySide, connected, rematch:[me,them] }
};

function gameOver() { return !!App.result || (App.state && App.state.winner !== null); }
function localHumans() { return [0, 1].filter(i => !App.players[i].ai && !App.players[i].remote); }
function myIdx() { const h = localHumans(); return h.length === 1 ? h[0] : null; }

/* ---------------- Desenho de peças ---------------- */
function tileMarkup(p, r) {
  const type = p.color === 2 ? 'combo' : ptype(p);
  const col = TYPES[type].color;
  let body, edge;
  if (p.color === 0) { body = '#f3ecd9'; edge = '#b9ae92'; }
  else if (p.color === 1) { body = '#2d3037'; edge = '#0b0c0f'; }
  else { body = '#3d3010'; edge = '#171204'; }
  let s = `<polygon points="${hexPts(r)}" fill="${edge}" stroke="#000" stroke-width="${r * 0.04}" stroke-linejoin="round"/>`;
  s += `<polygon points="${hexPts(r * 0.9)}" fill="${body}"/>`;
  if (p.color === 2 && App.state && App.state.combo) {
    const f = App.state.combo.face;
    s += `<polygon points="${hexPts(r * 0.86)}" fill="none" stroke="${f === 0 ? '#f3ecd9' : '#111'}" stroke-width="${r * 0.13}" stroke-linejoin="round"/>`;
    s += `<polygon points="${hexPts(r * 0.86)}" fill="none" stroke="#777" stroke-width="${r * 0.02}"/>`;
  }
  if (p.face && p.back) {
    s += `<polygon points="${hexPts(r * 0.8)}" fill="none" stroke="#7fd13b" stroke-width="${r * 0.05}" stroke-dasharray="${r * 0.2} ${r * 0.1}"/>`;
  }
  s += `<g transform="scale(${(r * 0.0152).toFixed(4)})">${iconMarkup(type, col)}</g>`;
  if (p.frozen > 0) {
    s += `<polygon points="${hexPts(r * 0.9)}" fill="rgba(120,200,255,.38)"/><text x="0" y="${r * 0.3}" text-anchor="middle" font-size="${r * 0.9}" fill="#fff">❄</text>`;
  }
  return s;
}
function tileSVG(p, px) {
  return `<svg viewBox="-24 -24 48 48" width="${px}" height="${px}" aria-hidden="true">${tileMarkup(p, 22)}</svg>`;
}

/* ---------------- Classes de destaque ---------------- */
function stepClass(a, idx) {
  if (a.type === 'control') return idx === 0 ? 'control' : stepClass(a.inner, idx - 1);
  switch (a.type) {
    case 'throw': return idx === 0 ? 'throw' : 'move';
    case 'sting': case 'remove': return 'attack';
    case 'move': return a.swap ? 'swap' : 'move';
    default: return 'move';
  }
}
function stepLabel(a, idx) {
  if (a.type === 'control') return idx === 0 ? 'Controlar esta peça' : stepLabel(a.inner, idx - 1);
  if (a.type === 'throw' && idx === 0) return 'Arremessar esta peça';
  if (a.type === 'move' && !a.swap) return 'Mover para cá';
  if (a.type === 'place') return 'Colocar aqui';
  return a.label;
}
const CLS_PRI = { attack: 5, control: 4, throw: 3, swap: 2, move: 1 };

/* ---------------- Descrição das jogadas ---------------- */
function pname(p, faceOverride) {
  const f = faceOverride !== undefined ? faceOverride : p.face;
  return TYPES[(f && p.back) ? p.back : p.front].name;
}
function describe(s, a) {
  const who = WHO[s.turn];
  const nameAt = k => pname(topPiece(s, k));
  switch (a.type) {
    case 'place': return `${who}: coloca ${pname(s.pieces[a.pid], a.face)}`;
    case 'move': return `${who}: ${nameAt(a.from)} ${a.swap ? 'troca com ' + nameAt(a.to) : '→ ' + a.to}`;
    case 'throw': return `${who}: ${nameAt(a.from)} arremessa ${nameAt(a.target)}`;
    case 'sting': return `${who}: ${nameAt(a.from)} ferroa ${nameAt(a.target)}`;
    case 'remove': return `${who}: ${nameAt(a.from)} elimina ${nameAt(a.target)} (ambos saem)`;
    case 'control': return `${who}: ${nameAt(a.from)} controla ${nameAt(a.target)}`;
    case 'flip': { const p = s.pieces[a.pid]; return `${who}: vira ${pname(p)} → ${pname(p, p.face ? 0 : 1)}`; }
    case 'flipcombo': return `${who}: vira o Honeycombo (joga 2x no próximo turno)`;
    case 'draw': return `${who}: compra uma peça do saco`;
    case 'steal': return `${who}: rouba ${pname(s.pieces[a.pid])} do adversário`;
    case 'pass': return `${who}: sem jogadas — passa`;
  }
  return who;
}
function lastMoveOf(a) {
  const inn = a.type === 'control' ? a.inner : a;
  if (inn.type === 'place') return { to: inn.to };
  if (inn.type === 'throw') return { from: inn.target, to: inn.to };
  if (inn.type === 'move') return { from: inn.from, to: inn.to };
  if (inn.type === 'sting' || inn.type === 'flip') return { to: inn.target || inn.from };
  if (inn.type === 'remove') return { from: inn.from, to: inn.target };
  return null;
}

/* ---------------- Jogo ---------------- */
function humanTurn() {
  const s = App.state;
  if (!s || gameOver()) return false;
  const pl = App.players[s.turn];
  if (pl.ai || pl.remote || App.busy) return false;
  if (App.online && !App.online.connected) return false;
  return true;
}
function refreshActs() { App.acts = humanTurn() ? allActions(App.state) : []; }

/* ---------------- Relógio ---------------- */
function parseTime(v) {
  if (!v || v === '0') return null;
  const [m, i] = v.split('+');
  return { base: +m, inc: +i || 0 };
}
function clockRemaining(p) {
  const c = App.clock;
  if (!c) return Infinity;
  let ms = c.ms[p];
  if (c.running && !gameOver() && App.state.turn === p) ms -= Date.now() - c.last;
  return ms;
}
function fmtClock(ms) {
  ms = Math.max(0, ms);
  if (ms < 10000) return (ms / 1000).toFixed(1);
  const t = Math.ceil(ms / 1000);
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
}
function renderClocks() {
  if (!App.clock) return;
  document.querySelectorAll('[data-clock]').forEach(el => {
    const p = +el.dataset.clock;
    const ms = clockRemaining(p);
    el.textContent = fmtClock(ms);
    el.classList.toggle('low', ms < 30000);
    el.classList.toggle('run', App.clock.running && !gameOver() && App.state.turn === p);
  });
}
function endByTimeout(loser, announce) {
  if (gameOver()) return;
  App.clock.ms[loser] = 0;
  App.clock.running = false;
  App.result = { winner: 1 - loser, reason: 'tempo' };
  if (announce && App.online) Online.send({ t: 'timeout', loser });
  afterChange();
}
let flagTimer = null;
function clockTick() {
  const c = App.clock;
  if (!c || !App.state) return;
  renderClocks();
  if (!c.running || gameOver()) return;
  const t = App.state.turn;
  if (clockRemaining(t) > 0) { clearTimeout(flagTimer); flagTimer = null; return; }
  if (!App.players[t].remote) endByTimeout(t, true);
  else if (!flagTimer) {
    // aguarda um instante: a jogada do oponente pode estar a caminho
    flagTimer = setTimeout(() => { flagTimer = null; if (App.clock && !gameOver() && clockRemaining(t) <= 0) endByTimeout(t, false); }, 2500);
  }
}

function startGame(cfg, opts) {
  App.gameId++;
  App.state = opts.state || newGame(cfg);
  App.history = []; App.log = opts.log || []; App.sel = null; App.steps = []; App.cands = [];
  App.infoPiece = null; App.lastMove = opts.lastMove || null; App.busy = false; App.ended = false; App.result = null;
  App.view = { tx: 0, ty: 0, k: 1, auto: true };
  App.players = opts.players;
  App.bottom = opts.bottom;
  App.online = opts.online || null;
  App.clock = opts.time ? { base: opts.time.base, inc: opts.time.inc, ms: [opts.time.base * 1000, opts.time.base * 1000], running: false, last: 0 } : null;
  clearTimeout(flagTimer); flagTimer = null;
  $('modeBadge').textContent = App.state.cfg.mode === 'colony' ? 'Colony' : 'Original';
  if ($('endDialog').open) $('endDialog').close();
  afterChange();
}

function actionSig(a) {
  return JSON.stringify(a, (k, v) => (k === 'src' || k === 'label') ? undefined : v);
}

function doAction(a, remote, remoteMs) {
  const s = App.state;
  if (gameOver()) return;
  if (App.online && !remote && !App.online.connected) { toast('Sem conexão com o oponente.'); return; }
  const mover = s.turn;
  const now = Date.now();
  const c = App.clock;
  const clockSnap = c ? { ms: c.ms.slice(), running: c.running, last: c.last } : null;
  App.history.push({ state: s, logLen: App.log.length, lastMove: App.lastMove, clock: clockSnap });
  App.log.push({ who: mover, text: describe(s, a) });
  App.lastMove = lastMoveOf(a) || App.lastMove;
  const ns = applyAction(s, a);
  App.state = ns;
  if (c) {
    if (c.running) {
      if (remote && remoteMs != null) c.ms[mover] = remoteMs;
      else {
        c.ms[mover] -= now - c.last;
        if (ns.turn !== mover) c.ms[mover] += c.inc * 1000;
        if (c.ms[mover] <= 0) c.ms[mover] = 1;   // a jogada chegou a tempo
      }
    }
    if (!c.running && ns.winner === null) c.running = true;   // o relógio começa após a 1ª jogada
    c.last = now;
    if (ns.winner !== null) c.running = false;
  }
  if (App.online && !remote) {
    Online.send({ t: 'move', n: App.log.length - 1, a, ms: c ? c.ms[mover] : null });
  }
  App.sel = null; App.steps = []; App.cands = []; App.infoPiece = null;
  hideChooser();
  afterChange();
}

function resign() {
  if (gameOver() || !App.state) return;
  let who = myIdx();
  if (who === null) who = App.state.turn;
  if (!confirm(`${WHO[who]}: tem certeza que quer desistir?`)) return;
  App.result = { winner: 1 - who, reason: 'desistência' };
  if (App.clock) App.clock.running = false;
  if (App.online) Online.send({ t: 'resign', who });
  afterChange();
}

function afterChange() {
  const gid = App.gameId;
  const s = App.state;
  refreshActs();
  render();
  if (gameOver()) { showEnd(); return; }
  if (humanTurn() && App.acts.length === 1 && App.acts[0].type === 'pass') {
    toast('Você não tem jogadas possíveis — a vez passa.');
    setTimeout(() => { if (App.gameId === gid && App.state === s) doAction(App.acts[0]); }, 1100);
    return;
  }
  if (App.players[s.turn].ai) {
    App.busy = true;
    renderStatus();
    setTimeout(() => {
      if (App.gameId !== gid || App.state !== s || gameOver()) return;
      const a = aiChoose(s, App.players[s.turn].level);
      App.busy = false;
      doAction(a);
    }, 450);
  }
}

function undo() {
  if (App.busy || App.online || App.result || !App.history.length) return;
  App.gameId++;
  let h;
  do {
    h = App.history.pop();
    App.state = h.state; App.log.length = h.logLen; App.lastMove = h.lastMove;
    if (App.clock && h.clock) {
      App.clock.ms = h.clock.ms.slice(); App.clock.running = h.clock.running;
    }
  } while (App.history.length && App.players[App.state.turn].ai);
  if (App.clock) App.clock.last = Date.now();
  App.sel = null; App.steps = []; App.cands = []; App.infoPiece = null; App.ended = false;
  if ($('endDialog').open) $('endDialog').close();
  hideChooser();
  afterChange();
}

function showEnd() {
  const s = App.state;
  const winner = App.result ? App.result.winner : s.winner;
  let title, text;
  if (winner === 'draw') { title = 'Empate!'; text = 'As duas Rainhas foram cercadas ao mesmo tempo.'; }
  else {
    const loser = 1 - winner;
    if (App.result && App.result.reason === 'tempo') text = `O tempo das ${WHO[loser]} acabou.`;
    else if (App.result && App.result.reason === 'desistência') text = `As ${WHO[loser]} desistiram.`;
    else {
      const q = s.pieces[s.queens[loser]];
      text = q.loc === 'removed' ? `A Rainha das ${WHO[loser]} foi eliminada.` : `A Rainha das ${WHO[loser]} foi cercada.`;
    }
    title = `${WHO[winner]} vencem!`;
    const me = myIdx();
    if (me !== null) title = winner === me ? 'Você venceu! 🎉' : 'Você perdeu 😕';
  }
  $('endTitle').textContent = title;
  $('endText').textContent = text;
  $('endNew').textContent = App.online ? 'Revanche' : 'Novo jogo';
  if (!App.ended) {
    App.ended = true;
    setTimeout(() => { if (!$('endDialog').open) $('endDialog').showModal(); }, 500);
  }
}

/* ---------------- Seleção ---------------- */
function deselect() {
  App.sel = null; App.steps = []; App.cands = []; hideChooser();
  App.infoPiece = null;
  render();
}
function selectCell(k) {
  const s = App.state;
  App.sel = { src: 'board', cell: k };
  App.steps = [];
  App.cands = App.acts.filter(a => a.src === k && a.type !== 'flip');
  App.infoPiece = topPiece(s, k);
  hideChooser();
  render();
  const hasFlip = App.acts.some(a => a.src === k && a.type === 'flip');
  if (!App.cands.length && !hasFlip) {
    if (!queenPlaced(s, s.turn)) toast('Coloque a sua Rainha antes de mover peças.');
    else toast('Esta peça não tem movimentos agora.');
  }
}
function selectHand(pid) {
  const s = App.state;
  const p = s.pieces[pid];
  const forceQueen = s.placed[s.turn] >= 3 && !queenPlaced(s, s.turn);
  App.sel = { src: 'hand', pid };
  App.steps = [];
  const face = (p.face && p.back) ? 1 : 0;
  App.cands = App.acts.filter(a => a.type === 'place' && a.pid === pid && a.face === face);
  App.infoPiece = p;
  hideChooser();
  render();
  if (forceQueen && p.front !== 'queen') toast('Esta é a sua 4ª peça: você precisa colocar a Rainha agora!');
  else if (!App.cands.length) toast('Não há casa válida para esta peça agora.');
}

function onCellClick(k, isHl, ev) {
  const s = App.state;
  if (isHl && App.sel) { stepClick(k, ev); return; }
  hideChooser();
  const top = topPiece(s, k);
  if (!top) { deselect(); return; }
  if (App.sel && App.sel.src === 'board' && App.sel.cell === k) { deselect(); return; }
  if (humanTurn() && top.color === s.turn) selectCell(k);
  else {
    App.sel = null; App.steps = []; App.cands = [];
    App.infoPiece = top;
    render();
  }
}

function stepClick(k, ev) {
  const idx = App.steps.length;
  const matches = App.cands.filter(a => a.steps[idx] === k);
  if (!matches.length) return;
  const proceed = ms => {
    const complete = ms.filter(a => a.steps.length === idx + 1);
    const partial = ms.filter(a => a.steps.length > idx + 1);
    if (complete.length) { doAction(complete[0]); return; }
    App.steps.push(k);
    App.cands = partial;
    hideChooser();
    render();
  };
  const classes = [...new Set(matches.map(a => stepClass(a, idx)))];
  if (classes.length > 1) {
    const opts = classes.map(c => {
      const ms = matches.filter(a => stepClass(a, idx) === c);
      return { label: stepLabel(ms[0], idx), fn: () => proceed(ms) };
    });
    showChooser(opts, ev);
  } else proceed(matches);
}

/* ---------------- Chooser / toast ---------------- */
function showChooser(opts, ev) {
  const c = $('chooser');
  c.innerHTML = '';
  for (const o of opts) {
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = o.label;
    b.onclick = () => { hideChooser(); o.fn(); };
    c.appendChild(b);
  }
  const wr = $('boardWrap').getBoundingClientRect();
  let x = (ev && ev.clientX ? ev.clientX : wr.left + 100) - wr.left + 8;
  let y = (ev && ev.clientY ? ev.clientY : wr.top + 100) - wr.top + 8;
  c.hidden = false;
  x = Math.min(x, wr.width - c.offsetWidth - 8);
  y = Math.min(y, wr.height - c.offsetHeight - 8);
  c.style.left = Math.max(4, x) + 'px'; c.style.top = Math.max(4, y) + 'px';
}
function hideChooser() { $('chooser').hidden = true; }
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------------- Renderização ---------------- */
function highlightMap() {
  const idx = App.steps.length;
  const map = new Map();
  for (const a of App.cands) {
    const c = a.steps[idx];
    if (c === undefined) continue;
    const cls = stepClass(a, idx);
    const cur = map.get(c);
    if (!cur || CLS_PRI[cls] > CLS_PRI[cur]) map.set(c, cls);
  }
  return map;
}

function render() {
  renderBoard();
  renderHands();
  renderStatus();
  renderInfo();
  renderActions();
  renderLog();
  $('btnUndo').disabled = !App.history.length || App.busy || !!App.online || !!App.result;
  $('btnUndo').hidden = !!App.online;
  $('gameBtns').hidden = gameOver();
  renderChip();
  renderInfoBar();
}

function renderChip() {
  const s = App.state;
  let t;
  if (gameOver()) t = '🏁 Fim de jogo';
  else {
    const me = myIdx();
    t = `<span class="dot ${s.turn === 0 ? 'w' : 'b'}"></span> ${me === s.turn && humanTurn() ? 'Sua vez' : 'Vez das ' + WHO[s.turn]}`;
    if (App.busy) t += ' · pensando…';
    if (s.actionsLeft > 1) t += ' · ⚡2 jogadas';
  }
  if (App.online && !App.online.connected) t += ' · 🔌 sem conexão';
  $('turnChip').innerHTML = t;
}

function renderInfoBar() {
  const p = App.hoverPiece || App.infoPiece;
  const el = $('infoBar');
  if (!p) { el.hidden = true; return; }
  const T = TYPES[ptype(p)];
  el.hidden = false;
  el.innerHTML = `<b>${T.name}</b> — ${T.desc}`;
}

function renderBoard() {
  const s = App.state;
  const hl = highlightMap();
  let out = '<g id="world">';
  // última jogada
  if (App.lastMove) {
    for (const k of [App.lastMove.from, App.lastMove.to]) {
      if (!k) continue;
      const [x, y] = cellXY(k);
      out += `<polygon class="lastmv" transform="translate(${x},${y})" points="${hexPts(R * 0.96)}"/>`;
    }
  }
  // peças
  const sorted = Object.keys(s.board);
  for (const k of sorted) {
    const st = s.board[k];
    const [x, y] = cellXY(k);
    const top = s.pieces[st[st.length - 1]];
    const mine = humanTurn() && top.color === s.turn;
    out += `<g class="piece${mine ? ' mine' : ''}" data-cell="${k}" transform="translate(${x},${y})">`;
    const n = st.length;
    for (let i = Math.max(0, n - 3); i < n; i++) {
      const off = (i - (n - 1)) * 4.2;
      out += `<g transform="translate(${off},${off})">${tileMarkup(s.pieces[st[i]], R)}</g>`;
    }
    if (n > 1) out += `<circle cx="${R * 0.58}" cy="${-R * 0.62}" r="10" fill="#e53935" stroke="#000" stroke-width="1.5"/><text x="${R * 0.58}" y="${-R * 0.62 + 4.5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${n}</text>`;
    out += '</g>';
  }
  // seleção
  if (App.sel && App.sel.src === 'board') {
    const [x, y] = cellXY(App.sel.cell);
    out += `<polygon class="selring" transform="translate(${x},${y})" points="${hexPts(R * 1.0)}"/>`;
  }
  if (App.steps.length) {
    for (const c of App.steps) {
      const [x, y] = cellXY(c);
      out += `<polygon class="selring" style="stroke:#4aa8ff" transform="translate(${x},${y})" points="${hexPts(R * 1.0)}"/>`;
    }
  }
  // destaques clicáveis
  for (const [c, cls] of hl) {
    const [x, y] = cellXY(c);
    const occ = !!s.board[c];
    out += `<g class="hl ${cls} ${occ ? 'occ' : 'empty'}" data-cell="${c}" transform="translate(${x},${y})"><polygon class="hl-hex" points="${hexPts(R * 0.94)}"/><circle class="hl-dot" r="${R * 0.2}"/></g>`;
  }
  out += '</g>';
  $('board').innerHTML = out;
  applyView(hl);
}

function applyView(hl) {
  const svg = $('board');
  const w = svg.clientWidth || 800, h = svg.clientHeight || 600;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const world = $('world');
  if (!world) return;
  if (App.view.auto) fitView(hl || highlightMap(), w, h);
  world.style.transform = `translate(${App.view.tx}px,${App.view.ty}px) scale(${App.view.k})`;
}

function fitView(hl, w, h) {
  const s = App.state;
  // enquadra só as peças (+1 anel de margem), para a tela não "pular" a cada seleção
  const cells = new Set(Object.keys(s.board));
  if (!cells.size) for (const c of hl.keys()) cells.add(c);
  if (!cells.size) cells.add('0,0');
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const c of cells) {
    const [x, y] = cellXY(c);
    x0 = Math.min(x0, x - R * 2.6); x1 = Math.max(x1, x + R * 2.6);
    y0 = Math.min(y0, y - R * 2.6); y1 = Math.max(y1, y + R * 2.6);
  }
  const pad = 8;
  const bw = x1 - x0, bh = y1 - y0;
  const k = Math.max(0.28, Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 1.5));
  App.view.k = k;
  App.view.tx = w / 2 - ((x0 + x1) / 2) * k;
  App.view.ty = h / 2 - ((y0 + y1) / 2) * k;
}

function renderHands() {
  const top = 1 - App.bottom;
  renderHand($('handTop'), top);
  renderHand($('handBottom'), App.bottom);
}
function renderHand(el, idx) {
  const s = App.state;
  const ids = s.hands[idx];
  const groups = new Map();
  for (const id of ids) {
    const p = s.pieces[id];
    const gk = p.color + '|' + p.front;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(id);
  }
  const pl = App.players[idx];
  const isTurn = !gameOver() && s.turn === idx;
  el.classList.toggle('active', isTurn);
  const tag = pl.ai ? ' (computador)' : pl.remote ? ' (oponente)' : (App.online ? ' (você)' : '');
  const clock = App.clock ? `<span class="clock" data-clock="${idx}">${fmtClock(clockRemaining(idx))}</span>` : '';
  let html = `<div class="who"><span>${WHO[idx]}${tag}${isTurn ? ' — vez de jogar' : ''}</span><span class="whoR">${s.cfg.swarm ? 'Saco: ' + s.bag.length + ' · ' : ''}${clock}</span></div>`;
  const mineHand = humanTurn() && s.turn === idx;
  for (const [gk, list] of groups) {
    const p = s.pieces[list[0]];
    const selected = App.sel && App.sel.src === 'hand' && list.includes(App.sel.pid);
    const stealable = humanTurn() && s.turn !== idx && p.color === s.turn;
    const cls = ['htile'];
    if (selected) cls.push('sel');
    if (!mineHand && !stealable) cls.push('dim');
    if (stealable) cls.push('steal');
    const flip = (s.cfg.venom && p.back && p.front !== 'queen' && mineHand) ? `<span class="flip" data-flip="${gk}" title="Virar para o outro lado antes de colocar">↻</span>` : '';
    html += `<button class="${cls.join(' ')}" data-pid="${list[0]}" data-idx="${idx}" title="${pname(p)}">${tileSVG(p, 56)}${list.length > 1 ? `<span class="cnt">${list.length}</span>` : ''}${flip}</button>`;
  }
  if (!groups.size) html += '<span class="handinfo">Mão vazia</span>';
  el.innerHTML = html;
}

function renderStatus() {
  const s = App.state;
  let html = '';
  if (App.online) {
    const o = App.online;
    html += `<div class="sub">🌐 Online · você joga de ${WHO[o.mySide]} · oponente ${o.connected ? '<b style="color:var(--good)">conectado</b>' : '<b style="color:var(--bad)">desconectado</b> (reconectando…)'}</div>`;
  }
  if (gameOver()) {
    html += `<div class="turnline">🏁 Fim de jogo</div>`;
  } else {
    html += `<div class="turnline"><span class="dot ${s.turn === 0 ? 'w' : 'b'}"></span> Vez das ${WHO[s.turn]}${App.busy ? ' <span class="thinking">· pensando…</span>' : ''}</div>`;
    if (s.actionsLeft > 1) html += `<div class="sub">⚡ Honeycombo: jogue ${s.actionsLeft} vezes neste turno.</div>`;
    const forceQueen = s.placed[s.turn] >= 3 && !queenPlaced(s, s.turn);
    if (forceQueen && humanTurn()) html += `<div class="sub" style="color:var(--accent)">Você deve colocar a Rainha neste turno.</div>`;
  }
  for (const c of [0, 1]) {
    const n = queenPressure(s, c);
    const q = s.pieces[s.queens[c]];
    let pips = '';
    if (n >= 0) { for (let i = 0; i < 6; i++) pips += `<span class="pip${i < n ? ' on' : ''}"></span>`; }
    const label = q.loc === 'removed' ? 'eliminada' : n < 0 ? 'ainda na mão' : `${n}/6 cercada`;
    html += `<div class="qrow"><span class="dot ${c === 0 ? 'w' : 'b'}"></span> Rainha ${c === 0 ? 'branca' : 'preta'} <span class="pips">${pips}</span> <span class="sub" style="margin:0">${label}</span></div>`;
  }
  if (s.combo) {
    const lock = s.combo.lockedFor !== null ? ' (travado)' : '';
    html += `<div class="sub">🍯 Honeycombo: lado das ${WHO[s.combo.face]} para cima${lock}.</div>`;
  }
  $('status').innerHTML = html;
}

function renderInfo() {
  const p = App.hoverPiece || App.infoPiece;
  const el = $('info');
  if (!p) {
    el.innerHTML = `<h3>Peça</h3><p class="infotext">Clique numa peça sua no tabuleiro ou na mão para ver para onde ela pode ir. Passe o mouse sobre qualquer peça para ver as regras dela.</p>`;
    return;
  }
  const t = ptype(p);
  const T = TYPES[t];
  let html = `<h3>Peça</h3><div class="infohead">${tileSVG(p, 64)}<div><b>${T.name}</b><small>${p.color === 2 ? 'neutra' : WHO[p.color]}${p.frozen ? ' · paralisada ❄' : ''}</small></div></div>`;
  html += `<p class="infotext">${T.desc}</p>`;
  if (p.back) {
    const other = p.face ? p.front : p.back;
    html += `<div class="infoback"><b>↻ Outro lado:</b> ${TYPES[other].name} — ${TYPES[other].desc}</div>`;
  }
  el.innerHTML = html;
  renderInfoBar();
}

function renderActions() {
  const el = $('actions');
  const s = App.state;
  if (!humanTurn()) { el.hidden = true; return; }
  let html = '';
  const btns = [];
  if (App.sel && App.sel.src === 'board') {
    const f = App.acts.find(a => a.type === 'flip' && a.src === App.sel.cell);
    if (f) btns.push({ label: '↻ Virar esta peça (gasta o turno)', a: f });
  }
  const fc = App.acts.find(a => a.type === 'flipcombo');
  if (fc) btns.push({ label: '🍯 Virar o Honeycombo (joga 2x no próximo turno)', a: fc });
  const dr = App.acts.find(a => a.type === 'draw');
  if (dr) btns.push({ label: '🎲 Comprar uma peça do saco (gasta o turno)', a: dr });
  if (s.cfg.swarm && App.acts.some(a => a.type === 'steal')) html += `<div class="sub">Para roubar uma peça sua da mão do adversário, clique nela (tem contorno laranja).</div>`;
  if (!btns.length && !html) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '<h3>Ações especiais</h3>' + html;
  btns.forEach(b => {
    const bt = document.createElement('button');
    bt.className = 'btn block'; bt.textContent = b.label;
    bt.onclick = () => doAction(b.a);
    el.appendChild(bt);
  });
}

function renderLog() {
  const ol = $('log');
  ol.innerHTML = App.log.map((e, i) => `<li class="${i === App.log.length - 1 ? 'last' : ''}"><span class="n">${i + 1}.</span><span class="w" style="background:${e.who === 0 ? '#f3ecd9' : '#2d3037'}"></span><span>${e.text.replace(/^[^:]+:\s*/, '')}</span></li>`).join('');
  ol.scrollTop = ol.scrollHeight;
}

/* ---------------- Eventos do tabuleiro ---------------- */
function setupBoardEvents() {
  const svg = $('board');
  const ptrs = new Map();
  let drag = null, pinch = null;
  const setWorld = () => {
    const w = $('world');
    if (w) { w.style.transition = 'none'; w.style.transform = `translate(${App.view.tx}px,${App.view.ty}px) scale(${App.view.k})`; }
  };
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: App.view.k, tx: App.view.tx, ty: App.view.ty, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      drag = null; App.view.auto = false;
      return;
    }
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, tx: App.view.tx, ty: App.view.ty, moved: false };
  });
  window.addEventListener('pointermove', e => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = svg.getBoundingClientRect();
      const nk = Math.max(0.2, Math.min(3, pinch.k * d / pinch.d));
      const mx = pinch.cx - rect.left, my = pinch.cy - rect.top;
      App.view.k = nk;
      App.view.tx = mx - (mx - pinch.tx) * (nk / pinch.k) + ((a.x + b.x) / 2 - pinch.cx);
      App.view.ty = my - (my - pinch.ty) * (nk / pinch.k) + ((a.y + b.y) / 2 - pinch.cy);
      setWorld();
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 8) {
      drag.moved = true; App.view.auto = false;
      svg.classList.add('dragging');
    }
    if (drag.moved) { App.view.tx = drag.tx + dx; App.view.ty = drag.ty + dy; setWorld(); }
  });
  window.addEventListener('pointerup', e => {
    ptrs.delete(e.pointerId);
    if (pinch) { if (ptrs.size < 2) { pinch = null; drag = null; } return; }
    if (!drag) return;
    const d = drag; drag = null;
    svg.classList.remove('dragging');
    if (d.moved) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const g = target && target.closest ? target.closest('#board [data-cell]') : null;
    if (!g) { if (target && target.closest && target.closest('#board')) deselect(); return; }
    onCellClick(g.dataset.cell, g.classList.contains('hl'), e);
  });
  window.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; pinch = null; svg.classList.remove('dragging'); });
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const v = App.view;
    const nk = Math.max(0.2, Math.min(3, v.k * Math.exp(-e.deltaY * 0.0015)));
    v.tx = mx - (mx - v.tx) * (nk / v.k);
    v.ty = my - (my - v.ty) * (nk / v.k);
    v.k = nk; v.auto = false;
    setWorld();
  }, { passive: false });
  svg.addEventListener('mouseover', e => {
    const g = e.target.closest ? e.target.closest('.piece') : null;
    const p = g ? topPiece(App.state, g.dataset.cell) : null;
    const id = p ? p.id : null;
    if ((App.hoverPiece ? App.hoverPiece.id : null) !== id) { App.hoverPiece = p; renderInfo(); }
  });
  svg.addEventListener('mouseleave', () => { if (App.hoverPiece) { App.hoverPiece = null; renderInfo(); } });
}

function setupHandEvents() {
  for (const id of ['handTop', 'handBottom']) {
    const el = $(id);
    el.addEventListener('click', e => {
      const fl = e.target.closest('.flip');
      const tile = e.target.closest('.htile');
      if (fl) {
        e.stopPropagation();
        const gk = fl.dataset.flip;
        const s = App.state;
        for (const pid of s.hands[s.turn]) {
          const p = s.pieces[pid];
          if (p.color + '|' + p.front === gk && p.back) p.face = p.face ? 0 : 1;
        }
        if (App.sel && App.sel.src === 'hand') selectHand(App.sel.pid); else render();
        return;
      }
      if (!tile) return;
      const s = App.state;
      const idx = +tile.dataset.idx, pid = tile.dataset.pid;
      if (!humanTurn()) { App.infoPiece = s.pieces[pid]; renderInfo(); return; }
      if (idx === s.turn) {
        if (App.sel && App.sel.src === 'hand' && App.sel.pid === pid) deselect(); else selectHand(pid);
      } else if (s.cfg.swarm) {
        const a = App.acts.find(x => x.type === 'steal' && x.pid === pid);
        if (a) showChooser([{ label: `Roubar ${pname(s.pieces[pid])} (gasta o turno)`, fn: () => doAction(a) }], e);
      }
    });
    el.addEventListener('mouseover', e => {
      const tile = e.target.closest('.htile');
      const p = tile ? App.state.pieces[tile.dataset.pid] : null;
      if ((App.hoverPiece ? App.hoverPiece.id : null) !== (p ? p.id : null)) { App.hoverPiece = p; renderInfo(); }
    });
    el.addEventListener('mouseleave', () => { if (App.hoverPiece) { App.hoverPiece = null; renderInfo(); } });
  }
}

/* ---------------- Online ---------------- */
function makeOnline(mySide, hostSide) {
  const o = { mySide, hostSide, rematch: [false, false] };
  Object.defineProperty(o, 'connected', { get: () => Online.connected });
  return o;
}
function onlinePlayers(mySide) { return [0, 1].map(i => ({ ai: false, remote: i !== mySide })); }

function buildSync() {
  const c = App.clock;
  let clock = null;
  if (c) {
    const ms = c.ms.slice();
    if (c.running && !gameOver()) ms[App.state.turn] -= Date.now() - c.last;
    clock = { base: c.base, inc: c.inc, ms, running: c.running };
  }
  return { t: 'sync', state: App.state, log: App.log, lastMove: App.lastMove, clock, hostSide: App.online.hostSide, result: App.result };
}
function applySync(m) {
  const mySide = 1 - m.hostSide;
  startGame(null, {
    state: m.state, players: onlinePlayers(mySide), bottom: mySide, online: makeOnline(mySide, m.hostSide),
    time: m.clock ? { base: m.clock.base, inc: m.clock.inc } : null, log: m.log, lastMove: m.lastMove
  });
  if (m.clock) { App.clock.ms = m.clock.ms; App.clock.running = m.clock.running; App.clock.last = Date.now(); }
  if (m.result) { App.result = m.result; afterChange(); }
}
function requestSync() {
  if (!App.online) return;
  if (Online.role === 'host') Online.send(buildSync());
  else Online.send({ t: 'hello', token: Online.token });
}
function onRemoteMove(msg) {
  if (gameOver() || !App.online) return;
  if (msg.n !== App.log.length || !App.players[App.state.turn].remote) { requestSync(); return; }
  const sig = actionSig(msg.a);
  const match = allActions(App.state).find(x => actionSig(x) === sig);
  if (!match) { requestSync(); return; }
  doAction(match, true, msg.ms);
}
function onOnlineMessage(msg) {
  if (!msg || !msg.t) return;
  switch (msg.t) {
    case 'hello':
      if (Online.role === 'host' && App.online) { refreshActs(); render(); Online.send(buildSync()); }
      break;
    case 'sync':
      if (Online.role === 'guest') {
        applySync(msg);
        $('joinDialog').open && $('joinDialog').close();
        toast('Conectado! Você joga de ' + WHO[App.online.mySide] + '.');
      }
      break;
    case 'move': onRemoteMove(msg); break;
    case 'resign':
      if (!gameOver()) { App.result = { winner: 1 - msg.who, reason: 'desistência' }; if (App.clock) App.clock.running = false; afterChange(); }
      break;
    case 'timeout':
      if (!gameOver() && App.clock) { App.clock.ms[msg.loser] = 0; App.clock.running = false; App.result = { winner: 1 - msg.loser, reason: 'tempo' }; afterChange(); }
      break;
    case 'rematch':
      if (App.online) {
        App.online.rematch[1] = true;
        toast('O oponente quer revanche.');
        if (Online.role === 'host' && App.online.rematch[0]) startRematch();
      }
      break;
  }
}
function onOnlineStatus(st) {
  switch (st.kind) {
    case 'room':
      $('roomCode').textContent = Online.code;
      $('roomLink').value = Online.link();
      $('lobbyStatus').textContent = 'Aguardando o seu amigo entrar…';
      break;
    case 'error':
      if ($('joinDialog').open) $('joinStatus').textContent = st.message;
      else if ($('lobbyDialog').open) $('lobbyStatus').textContent = st.message;
      else toast(st.message);
      break;
    case 'connected':
      if (Online.role === 'host') {
        if ($('lobbyDialog').open) $('lobbyDialog').close();
        toast('Oponente conectado!');
      } else if (App.online) toast('Reconectado.');
      if (App.online) { App.sel = null; App.steps = []; App.cands = []; refreshActs(); render(); }
      break;
    case 'disconnected':
      if (App.online && !gameOver()) { toast('Oponente desconectado — aguardando reconexão…'); App.sel = null; App.steps = []; App.cands = []; refreshActs(); render(); }
      break;
  }
}
function startRematch() {
  const o = App.online;
  const cfg = App.state.cfg;
  const time = App.clock ? { base: App.clock.base, inc: App.clock.inc } : null;
  const hostSide = 1 - o.hostSide;
  startGame(cfg, { players: onlinePlayers(hostSide), bottom: hostSide, online: makeOnline(hostSide, hostSide), time });
  Online.send(buildSync());
}
function endNewClicked() {
  $('endDialog').close();
  if (App.online) {
    App.online.rematch[0] = true;
    Online.send({ t: 'rematch' });
    if (Online.role === 'host' && App.online.rematch[1]) startRematch();
    else toast('Revanche pedida — aguardando o oponente…');
  } else { syncNewForm(); $('newDialog').showModal(); }
}

function startOnlineHost(o) {
  if (!Online.available()) { toast('A biblioteca de jogo online não carregou. Verifique a conexão.'); return; }
  const hostSide = o.hostSide;
  startGame(o.cfg, { players: onlinePlayers(hostSide), bottom: hostSide, online: makeOnline(hostSide, hostSide), time: o.time });
  $('roomCode').textContent = '…';
  $('roomLink').value = '';
  $('lobbyStatus').textContent = 'Conectando ao servidor de salas…';
  Online.host();
  $('lobbyDialog').showModal();
}
function joinRoom(code) {
  if (!Online.available()) { $('joinStatus').textContent = 'A biblioteca de jogo online não carregou. Verifique a conexão.'; return; }
  code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) { $('joinStatus').textContent = 'O código tem 5 caracteres.'; return; }
  $('joinCode').value = code;
  $('joinStatus').textContent = 'Conectando…';
  Online.join(code);
}
function newDefaultGame() {
  Online.leave(true);
  startGame({ mode: 'original' }, { players: [{ ai: false }, { ai: true, level: 'medium' }], bottom: 0, time: parseTime('600+0') });
}

/* ---------------- Diálogos ---------------- */
function readNewForm() {
  const f = $('newForm');
  const g = n => f.elements[n];
  const mode = g('mode').value;
  const cfg = { mode, mosquito: g('mosquito').checked, ladybug: g('ladybug').checked, pillbug: g('pillbug').checked };
  if (mode === 'colony') for (const k of ['venom', 'swarm', 'predators', 'guardians', 'honeycombo']) cfg[k] = g(k).checked;
  const opp = g('opp').value;
  const time = parseTime(g('time').value);
  let side = g('side').value;
  if (side === 'r') side = Math.random() < 0.5 ? '0' : '1';
  const me = +side;
  if (opp === 'online') return { cfg, time, online: true, hostSide: me };
  let players, bottom = 0;
  if (opp === 'human') players = [{ ai: false }, { ai: false }];
  else {
    players = [{ ai: false }, { ai: false }];
    players[1 - me] = { ai: true, level: opp };
    bottom = me;
  }
  return { cfg, players, bottom, time };
}
function syncNewForm() {
  const f = $('newForm');
  const colony = f.elements.mode.value === 'colony';
  $('colonyOpts').hidden = !colony;
  $('sideRow').hidden = f.elements.opp.value === 'human';
}
function buildRules() {
  const order = [
    ['Hive original', ['queen', 'beetle', 'grasshopper', 'spider', 'ant']],
    ['Expansões oficiais', ['mosquito', 'ladybug', 'pillbug']],
    ['Colony — Venom (versos)', ['wasp', 'shieldbug', 'fly', 'dragonfly', 'scorpion', 'tick', 'firefly', 'centipede']],
    ['Colony — Predators', ['mantis', 'assassin']],
    ['Colony — Guardians', ['butterfly', 'moth']],
    ['Colony — Honeycombo', ['combo']]
  ];
  let html = '';
  for (const [title, list] of order) {
    html += `<h4 style="grid-column:1/-1;margin:8px 0 0;color:#9aa3b2">${title}</h4>`;
    for (const t of list) {
      const T = TYPES[t];
      const fake = { color: t === 'combo' ? 2 : 0, front: t, back: null, face: 0, frozen: 0 };
      const back = Object.keys(VENOM_BACK).find(k => VENOM_BACK[k] === t);
      html += `<div class="piece-item">${tileSVG(fake, 54)}<div><b>${T.name}</b><span>${T.desc}</span>${back ? `<br><em>verso do(a) ${TYPES[back].name}</em>` : ''}</div></div>`;
    }
  }
  $('rulesPieces').innerHTML = html;
}

function init() {
  $('logoBee').innerHTML = iconMarkup('queen', '#1a1a1a');
  setupBoardEvents();
  setupHandEvents();
  buildRules();
  Online.handlers.onMessage = onOnlineMessage;
  Online.handlers.onStatus = onOnlineStatus;

  $('btnNew').onclick = () => { syncNewForm(); $('newDialog').showModal(); };
  $('btnJoin').onclick = () => { $('joinStatus').textContent = ''; $('joinDialog').showModal(); setTimeout(() => $('joinCode').focus(), 50); };
  $('btnUndo').onclick = undo;
  $('btnResign').onclick = resign;
  $('btnFit').onclick = () => { App.view.auto = true; const w = $('world'); if (w) w.style.transition = ''; applyView(); };
  $('btnRules').onclick = () => $('rulesDialog').showModal();
  $('rulesClose').onclick = () => $('rulesDialog').close();
  $('newForm').addEventListener('change', syncNewForm);
  $('newCancel').onclick = e => { e.preventDefault(); $('newDialog').close(); };
  $('newOk').onclick = e => {
    e.preventDefault();
    const o = readNewForm();
    $('newDialog').close();
    if (o.online) { startOnlineHost(o); return; }
    Online.leave(true);
    startGame(o.cfg, { players: o.players, bottom: o.bottom, time: o.time });
  };
  $('endNew').onclick = endNewClicked;
  $('endView').onclick = () => $('endDialog').close();

  $('joinCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('joinCode').value); });
  $('joinGo').onclick = () => joinRoom($('joinCode').value);
  $('joinCancel').onclick = () => { $('joinDialog').close(); if (App.online && Online.role === 'guest' && !Online.joined) { Online.leave(true); newDefaultGame(); } };
  $('lobbyLeave').onclick = () => { $('lobbyDialog').close(); newDefaultGame(); };
  $('lobbyCopy').onclick = async () => {
    const link = $('roomLink').value;
    try { await navigator.clipboard.writeText(link); toast('Link copiado!'); }
    catch (e) { $('roomLink').select(); document.execCommand && document.execCommand('copy'); toast('Link copiado!'); }
  };
  $('lobbyShare').onclick = async () => {
    const link = $('roomLink').value;
    if (navigator.share) { try { await navigator.share({ title: 'Hive Colony', text: 'Vamos jogar Hive! Código da sala: ' + Online.code, url: link }); } catch (e) { /* cancelado */ } }
    else { try { await navigator.clipboard.writeText(link); } catch (e) { /* ignore */ } toast('Link copiado!'); }
  };
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) deselect();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  });
  let rz = null;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (App.state) applyView(); }, 80); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (App.state) applyView(); }).observe($('boardWrap'));
  setInterval(clockTick, 200);
  // ao voltar para a aba (celular), força uma checagem de conexão/relógio
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { clockTick(); if (App.online && !Online.connected && Online.role === 'guest') Online.scheduleRetry(); } });

  newDefaultGame();
  syncNewForm();
  let room = null;
  try { room = new URLSearchParams(location.search).get('sala'); } catch (e) { /* ignore */ }
  if (room) {
    $('joinStatus').textContent = '';
    $('joinDialog').showModal();
    joinRoom(room);
  } else $('newDialog').showModal();
}

document.addEventListener('DOMContentLoaded', init);
