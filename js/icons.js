'use strict';
/* Silhuetas de insetos (vista de cima) desenhadas em SVG, viewBox -50..50.
   Cada função recebe a cor do inseto (c) e a cor de detalhe (d). */

const D = '#1a1a1a';
const L = (d, c, w = 3) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const MR = s => s + `<g transform="scale(-1 1)">${s}</g>`;
const E = (cx, cy, rx, ry, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${extra}/>`;
const CI = (cx, cy, r, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" ${extra}/>`;
const P = (d, extra = '') => `<path d="${d}" ${extra}/>`;
const WING = 'fill="#ffffff" fill-opacity=".55" stroke="rgba(0,0,0,.35)" stroke-width="1"';

const ICON_BODY = {
  queen: (c, d) =>
    MR(E(-15, -9, 17, 7.5, `transform="rotate(-28 -15 -9)" ${WING}`)) +
    MR(L('M-3 -25 Q-7 -36 -15 -38', c, 2)) +
    MR(L('M-9 -4 L-22 2 M-10 6 L-24 14', c, 2.6)) +
    E(0, 16, 11.5, 19, `fill="${c}"`) +
    P('M-10.5 9 Q0 13 10.5 9 M-11.5 18 Q0 22 11.5 18 M-8.5 27 Q0 31 8.5 27', `fill="none" stroke="${d}" stroke-width="3.2"`) +
    P('M0 35 L0 43', `stroke="${d}" stroke-width="2.4"`) +
    E(0, -6, 9.5, 9, `fill="${c}"`) + CI(0, -20, 6.5, `fill="${c}"`) +
    CI(-3, -21, 1.6, `fill="${d}" stroke="none"`) + CI(3, -21, 1.6, `fill="${d}" stroke="none"`),

  beetle: (c, d) =>
    MR(L('M-14 -8 L-31 -17 M-16 4 L-36 6 M-14 17 L-31 31', c, 3.6)) +
    MR(L('M-4 -35 L-11 -46', c, 3.8)) +
    E(0, 9, 17.5, 26, `fill="${c}"`) + L('M0 -16 V35', d, 2) +
    E(0, -21, 11.5, 8, `fill="${c}"`) + L('M-9 -15 Q0 -11 9 -15', d, 1.6) +
    CI(0, -32, 6, `fill="${c}"`),

  grasshopper: (c, d) =>
    MR(L('M-6 6 L-27 -7 L-22 27 L-32 46', c, 4.2)) +
    MR(L('M-6 -10 L-21 -19 M-6 -1 L-24 4', c, 3.2)) +
    MR(L('M-3 -34 Q-8 -44 -21 -48', c, 2)) +
    E(0, 6, 8.5, 28, `fill="${c}"`) +
    MR(P('M-3 -2 L-3 34', `stroke="${d}" stroke-width="1.5" fill="none"`)) +
    E(0, -27, 8, 9.5, `fill="${c}"`) +
    CI(-4.5, -29, 2.6, `fill="${d}" stroke="none"`) + CI(4.5, -29, 2.6, `fill="${d}" stroke="none"`),

  spider: (c, d) =>
    MR(L('M-8 -14 L-21 -31 L-39 -29', c, 2.8)) +
    MR(L('M-9 -8 L-28 -15 L-43 -7', c, 2.8)) +
    MR(L('M-9 -2 L-28 4 L-43 17', c, 2.8)) +
    MR(L('M-8 4 L-21 24 L-36 41', c, 2.8)) +
    E(0, 14, 14, 17, `fill="${c}"`) +
    P('M0 4 V26 M-7 9 Q0 15 7 9', `fill="none" stroke="${d}" stroke-width="2"`) +
    E(0, -9, 9.5, 11, `fill="${c}"`) +
    MR(CI(-3, -16, 1.8, `fill="${d}" stroke="none"`)) + MR(CI(-3, -11, 1.4, `fill="${d}" stroke="none"`)),

  ant: (c, d) =>
    MR(L('M-4 -13 L-22 -23 L-31 -14', c, 3)) +
    MR(L('M-5 -7 L-27 -6 L-35 7', c, 3)) +
    MR(L('M-4 -1 L-20 9 L-26 28', c, 3)) +
    MR(L('M-3 -32 L-9 -42 L-19 -41', c, 2.2)) +
    E(0, 17, 11.5, 17, `fill="${c}"`) +
    E(0, -7, 6.5, 10, `fill="${c}"`) +
    E(0, -26, 8.5, 7.5, `fill="${c}"`) +
    MR(P('M-4 -32 L-8 -37', `stroke="${c}" stroke-width="2.6"`)) +
    MR(CI(-4.2, -27, 1.6, `fill="${d}" stroke="none"`)),

  mosquito: (c, d) =>
    MR(E(-17, -2, 17, 5, `transform="rotate(-32 -17 -2)" ${WING}`)) +
    MR(L('M-3 -8 L-23 -22 L-40 -9', c, 1.8)) +
    MR(L('M-3 -4 L-27 2 L-42 24', c, 1.8)) +
    MR(L('M-3 1 L-21 15 L-31 41', c, 1.8)) +
    MR(L('M-2 -22 Q-8 -30 -15 -30', c, 1.6)) +
    E(0, 17, 4.5, 17, `fill="${c}"`) +
    P('M-4 12 H4 M-4.3 18 H4.3 M-4 24 H4', `stroke="${d}" stroke-width="1.4"`) +
    E(0, -6, 6.5, 9, `fill="${c}"`) + CI(0, -19, 5, `fill="${c}"`) +
    L('M0 -23 L0 -46', c, 2.2),

  ladybug: (c, d) =>
    MR(L('M-17 -3 L-30 -8 M-20 9 L-33 14 M-16 21 L-27 31', '#222', 3)) +
    MR(L('M-4 -34 Q-8 -42 -15 -43', '#222', 1.8)) +
    CI(0, 7, 26, `fill="${c}"`) +
    L('M0 -19 V33', d, 2) +
    P('M-14 -26 A15 11 0 0 1 14 -26 L11 -18 L-11 -18 Z', 'fill="#f4f4f4"') +
    CI(-5, -26, 1.6, `fill="${d}" stroke="none"`) + CI(5, -26, 1.6, `fill="${d}" stroke="none"`) +
    CI(-12, -2, 5.5, `fill="${d}" stroke="none"`) + CI(12, -2, 5.5, `fill="${d}" stroke="none"`) +
    CI(-14, 17, 5, `fill="${d}" stroke="none"`) + CI(14, 17, 5, `fill="${d}" stroke="none"`) +
    CI(-5, 28, 3.4, `fill="${d}" stroke="none"`) + CI(5, 28, 3.4, `fill="${d}" stroke="none"`),

  pillbug: (c, d) =>
    MR(L('M-19 -6 L-31 -4 M-21 6 L-33 10 M-18 18 L-28 26', c, 3)) +
    MR(L('M-4 -32 Q-8 -40 -14 -41', c, 2)) +
    E(0, 3, 22, 29, `fill="${c}"`) +
    P('M-21 -10 Q0 -3 21 -10 M-22 2 Q0 9 22 2 M-20 14 Q0 21 20 14 M-14 24 Q0 30 14 24', `fill="none" stroke="${d}" stroke-width="2.2" stroke-opacity=".75"`) +
    P('M0 -24 V30', `stroke="${d}" stroke-width="1.2" stroke-opacity=".45"`) +
    CI(0, -30, 6.5, `fill="${c}"`) + CI(-3, -31, 1.4, `fill="${d}" stroke="none"`) + CI(3, -31, 1.4, `fill="${d}" stroke="none"`),

  wasp: (c, d) =>
    MR(E(-16, -13, 18, 6.5, `transform="rotate(-38 -16 -13)" ${WING}`)) +
    MR(L('M-7 -4 L-22 0 M-6 2 L-20 12', c, 2.4)) +
    MR(L('M-3 -26 Q-8 -37 -16 -38', c, 1.9)) +
    P('M0 3 C-11 8 -11 28 0 42 C11 28 11 8 0 3 Z', `fill="${c}"`) +
    P('M-9 14 Q0 18 9 14 M-9.5 22 Q0 26 9.5 22 M-7 30 Q0 34 7 30', `fill="none" stroke="${d}" stroke-width="3.2"`) +
    CI(0, 4, 3.4, `fill="${c}"`) +
    E(0, -8, 7, 8.5, `fill="${c}"`) + CI(0, -21, 6.5, `fill="${c}"`) +
    CI(-3, -22, 1.8, `fill="${d}" stroke="none"`) + CI(3, -22, 1.8, `fill="${d}" stroke="none"`) +
    P('M0 41 L0 48', `stroke="${d}" stroke-width="2.4"`),

  firefly: (c, d) =>
    MR(E(-14, 4, 6, 24, `transform="rotate(-18 -14 4)" ${WING}`)) +
    MR(L('M-9 -8 L-24 -16 M-10 2 L-27 6 M-9 12 L-23 24', c, 2.8)) +
    MR(L('M-3 -31 Q-8 -40 -16 -41', c, 2)) +
    E(0, 6, 12, 25, `fill="${c}"`) + L('M0 -16 V24', d, 1.8) +
    E(0, -22, 9, 6.5, `fill="${c}"`) + CI(0, -31, 5, `fill="${c}"`) +
    P('M-8 25 Q0 52 8 25 Z', 'fill="#fff6a8" stroke="rgba(0,0,0,.35)"') +
    MR(L('M-10 36 L-17 40 M-7 41 L-10 48', '#fff6a8', 1.8)),

  dragonfly: (c, d) =>
    MR(E(-23, -22, 24, 6.5, `transform="rotate(-10 -23 -22)" ${WING}`)) +
    MR(E(-21, -9, 22, 6.5, `transform="rotate(8 -21 -9)" ${WING}`)) +
    E(0, 14, 3.8, 32, `fill="${c}"`) +
    P('M-3.5 14 H3.5 M-3.6 22 H3.6 M-3.4 30 H3.4 M-3.2 38 H3.2', `stroke="${d}" stroke-width="1.5"`) +
    E(0, -15, 7.5, 10, `fill="${c}"`) +
    CI(0, -29, 7, `fill="${c}"`) +
    CI(-5, -30, 3.8, 'fill="#fff" fill-opacity=".85" stroke="none"') + CI(5, -30, 3.8, 'fill="#fff" fill-opacity=".85" stroke="none"') +
    MR(L('M-4 -18 L-10 -12', c, 1.8)),

  scorpion: (c, d) =>
    MR(L('M-9 4 L-24 8 M-9 10 L-24 18 M-8 16 L-21 28 M-7 21 L-16 35', c, 2.6)) +
    MR(L('M-6 -10 L-16 -22', c, 3.2)) +
    MR(E(-19, -32, 6.5, 11, `transform="rotate(20 -19 -32)" fill="${c}"`)) +
    MR(P('M-23 -43 L-17 -36', `stroke="${d}" stroke-width="1.5"`)) +
    L('M0 18 C0 38 24 42 25 20 C26 6 19 -4 11 -15', c, 6) +
    P('M11 -15 L7 -26 L17 -20 Z', `fill="${d}" stroke="${c}"`) +
    E(0, 8, 10.5, 14, `fill="${c}"`) + P('M-9 5 Q0 8 9 5 M-9 12 Q0 15 9 12', `fill="none" stroke="${d}" stroke-width="1.5"`) +
    E(0, -9, 8.5, 8.5, `fill="${c}"`) +
    CI(-3, -12, 1.5, `fill="${d}" stroke="none"`) + CI(3, -12, 1.5, `fill="${d}" stroke="none"`),

  fly: (c, d) =>
    MR(E(-16, 4, 8.5, 23, `transform="rotate(14 -16 4)" ${WING}`)) +
    MR(L('M-7 -4 L-22 -10 L-30 -2 M-8 6 L-26 10 L-32 22 M-6 16 L-18 28', c, 2)) +
    E(0, 8, 10.5, 19, `fill="${c}"`) + P('M-9 8 Q0 12 9 8 M-8 16 Q0 20 8 16', `fill="none" stroke="${d}" stroke-width="1.5"`) +
    E(0, -10, 9.5, 8, `fill="${c}"`) + CI(0, -22, 8, `fill="${c}"`) +
    CI(-6, -24, 5, 'fill="#d9433b" stroke="rgba(0,0,0,.4)" stroke-width="1"') + CI(6, -24, 5, 'fill="#d9433b" stroke="rgba(0,0,0,.4)" stroke-width="1"') +
    MR(L('M-2 -29 L-5 -35', c, 1.8)),

  centipede: (c, d) => {
    let s = '';
    for (let i = 0; i < 10; i++) {
      const y = -34 + i * 7.6, x = 8 * Math.sin(i * 0.85);
      s += L(`M${(x - 6).toFixed(1)} ${y.toFixed(1)} L${(x - 17).toFixed(1)} ${(y + 5).toFixed(1)}`, c, 2.2);
      s += L(`M${(x + 6).toFixed(1)} ${y.toFixed(1)} L${(x + 17).toFixed(1)} ${(y + 5).toFixed(1)}`, c, 2.2);
    }
    for (let i = 9; i >= 0; i--) {
      const y = -34 + i * 7.6, x = 8 * Math.sin(i * 0.85);
      s += E(x.toFixed(1), y.toFixed(1), 8.4, 5.4, `fill="${c}"`);
      s += P(`M${(x - 4).toFixed(1)} ${y.toFixed(1)} H${(x + 4).toFixed(1)}`, `stroke="${d}" stroke-width="1" stroke-opacity=".5"`);
    }
    s += CI(0, -41, 5.2, `fill="${c}"`);
    s += MR(L('M-2 -45 Q-6 -49 -11 -48', c, 1.6));
    return s;
  },

  shieldbug: (c, d) =>
    MR(L('M-17 -8 L-30 -12 M-20 6 L-33 10 M-16 20 L-27 30', c, 2.8)) +
    MR(L('M-3 -34 Q-8 -41 -15 -41', c, 1.9)) +
    P('M0 -27 L16 -19 L23 3 L15 24 L0 34 L-15 24 L-23 3 L-16 -19 Z', `fill="${c}"`) +
    P('M-10 -9 L10 -9 L0 16 Z', `fill="none" stroke="${d}" stroke-width="1.8" stroke-opacity=".7"`) +
    P('M-10 -30 Q0 -40 10 -30 L5 -25 L-5 -25 Z', `fill="${c}"`) +
    CI(-4, -31, 1.4, `fill="${d}" stroke="none"`) + CI(4, -31, 1.4, `fill="${d}" stroke="none"`),

  tick: (c, d) =>
    MR(L('M-12 -10 L-26 -22 M-15 -3 L-33 -9 M-16 5 L-34 8 M-13 13 L-27 26', c, 2.6)) +
    CI(0, 8, 19, `fill="${c}"`) +
    E(0, 8, 9, 12, `fill="none" stroke="${d}" stroke-width="1.8" stroke-opacity=".7"`) +
    E(0, -13, 8, 6.5, `fill="${c}"`) +
    P('M-3 -19 L0 -26 L3 -19 Z', `fill="${d}"`),

  mantis: (c, d) =>
    MR(P('M-6 12 L-8 26 L-24 18 L-30 40', `fill="none" stroke="${c}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"`)) +
    MR(L('M-4 -20 L-19 -33 L-14 -9', c, 3.6)) +
    MR(L('M-14 -9 L-21 -7', d, 1.6)) +
    E(0, 17, 8.5, 20, `fill="${c}"`) + P('M-2 0 V36 M2 0 V36', `stroke="${d}" stroke-width="1.2" stroke-opacity=".6"`) +
    E(0, -8, 4.8, 17, `fill="${c}"`) +
    P('M-9 -32 L9 -32 L0 -20 Z', `fill="${c}"`) +
    CI(-7, -32, 3.4, `fill="${c}"`) + CI(7, -32, 3.4, `fill="${c}"`) +
    CI(-7, -32, 1.4, `fill="${d}" stroke="none"`) + CI(7, -32, 1.4, `fill="${d}" stroke="none"`) +
    MR(L('M-3 -35 Q-7 -43 -14 -45', c, 1.6)),

  assassin: (c, d) =>
    MR(L('M-11 -10 L-28 -16 L-33 -4 M-13 2 L-31 8 L-34 22 M-10 14 L-22 28', c, 2.6)) +
    MR(L('M-3 -30 Q-9 -38 -17 -37', c, 1.8)) +
    E(0, 12, 13, 23, `fill="${c}"`) +
    P('M-12.5 8 Q-13 20 -9 30 M12.5 8 Q13 20 9 30', `fill="none" stroke="${d}" stroke-width="1.8" stroke-dasharray="3 2.5"`) +
    P('M-8 -14 L8 -14 L10 -2 L-10 -2 Z', `fill="${c}"`) +
    E(0, -23, 5.5, 8.5, `fill="${c}"`) +
    L('M0 -30 Q1 -40 -3 -48', c, 2.6) +
    CI(-3.5, -24, 1.3, `fill="${d}" stroke="none"`) + CI(3.5, -24, 1.3, `fill="${d}" stroke="none"`),

  butterfly: (c, d) =>
    MR(P('M0 -6 C-18 -42 -48 -26 -41 -2 C-38 8 -14 6 0 0 Z', `fill="${c}"`)) +
    MR(P('M0 2 C-22 6 -36 20 -27 36 C-18 46 -4 28 0 12 Z', `fill="${c}" fill-opacity=".85"`)) +
    MR(CI(-30, -16, 6, `fill="${d}" fill-opacity=".55" stroke="none"`)) + MR(CI(-22, 28, 4, `fill="${d}" fill-opacity=".55" stroke="none"`)) +
    MR(L('M-4 -20 L-26 -22 M-4 -10 L-30 -8', d, 1)) +
    E(0, 4, 3.4, 22, `fill="${d}" stroke="${c}" stroke-width="1"`) + CI(0, -19, 3.8, `fill="${d}" stroke="${c}"`) +
    MR(L('M-1.5 -22 Q-5 -34 -12 -39', d, 1.6)),

  moth: (c, d) =>
    MR(P('M0 -8 L-44 -24 L-46 6 L-22 26 L0 16 Z', `fill="${c}"`)) +
    MR(P('M-8 -7 L-36 -17 M-8 0 L-39 2 M-8 7 L-30 18', `fill="none" stroke="${d}" stroke-width="1.6" stroke-opacity=".55"`)) +
    MR(CI(-34, -6, 4, `fill="${d}" fill-opacity=".5" stroke="none"`)) +
    E(0, 6, 6.5, 20, `fill="${c}" stroke="${d}" stroke-opacity=".5"`) + CI(0, -17, 5, `fill="${c}"`) +
    MR(L('M-2 -20 L-8 -34 M-5.5 -26 L-12 -26 M-7 -30 L-13 -31', c, 1.5)),

  combo: (c, d) => {
    const hex = (cx, cy, r, fill) => {
      let pts = '';
      for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); pts += `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)} `; }
      return `<polygon points="${pts}" fill="${fill}" stroke="${d}" stroke-width="1.6" stroke-opacity=".7"/>`;
    };
    let s = hex(0, 0, 13, c);
    for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i); s += hex(Math.cos(a) * 22.5, Math.sin(a) * 22.5, 13, i % 2 ? c : '#ffd86b'); }
    return s;
  }
};

function iconMarkup(type, color) {
  const f = ICON_BODY[type];
  if (!f) return '';
  return `<g class="bug-icon" stroke="rgba(0,0,0,.45)" stroke-width="1.1" stroke-linejoin="round">${f(color, D)}</g>`;
}
