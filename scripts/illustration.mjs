// Gezeichnetes Cover für Rezepte ohne Foto (Janitas Entscheidung 17.10.2026).
// Aufruf: npm run illustration -- <spec.json> <ausgabe.jpg>
// spec.json: { "bg": "#e9dcc9", "vessel": "plate" | "bowl" | "glass" | "board",
//              "items": [{ "type": "pasta", "count": 1, "spread": 0.6 }, …] }
// Die Reihenfolge der items ist die Zeichenreihenfolge (Unterlage zuerst, Toppings zuletzt).
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const W = 1200;
const H = 900;
const CX = W / 2;
const CY = H / 2 + 10;

function rng(seedText) {
  let seed = [...seedText].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const g = (x, y, rot, s, body) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(2)})">${body}</g>`;
const pick = (r, list) => list[Math.floor(r() * list.length)];

// Jede Form ist um (0,0) gezeichnet, Größe ca. 40–80 px bei scale 1.
const SHAPES = {
  leaf: (r) => {
    const c = pick(r, ['#4f8a3c', '#3f7a32', '#5e9b45', '#6aa84f']);
    return `<path d="M0 -38 C22 -20 22 20 0 38 C-22 20 -22 -20 0 -38Z" fill="${c}"/><path d="M0 -34 L0 34" stroke="#2f5f25" stroke-width="2" opacity=".5"/>`;
  },
  rucola: (r) => {
    const c = pick(r, ['#3f7a32', '#4f8a3c', '#5a9441']);
    return `<path d="M0 -44 C8 -34 18 -30 10 -20 C20 -14 22 -4 8 0 C18 8 16 18 4 18 L2 44 L-2 44 L-4 18 C-16 18 -18 8 -8 0 C-22 -4 -20 -14 -10 -20 C-18 -30 -8 -34 0 -44Z" fill="${c}"/>`;
  },
  herbs: (r) => `<circle r="5" fill="${pick(r, ['#3f7a32', '#5e9b45', '#2f6b28'])}"/>`,
  pasta: (r) => {
    let d = '';
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2;
      const rad = 30 + r() * 120;
      const x1 = Math.cos(a) * rad;
      const y1 = Math.sin(a) * rad;
      const a2 = a + 1.4 + r() * 1.5;
      const x2 = Math.cos(a2) * (40 + r() * 110);
      const y2 = Math.sin(a2) * (40 + r() * 110);
      d += `<path d="M${x1.toFixed(0)} ${y1.toFixed(0)} Q${(r() * 160 - 80).toFixed(0)} ${(r() * 160 - 80).toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="${pick(r, ['#f1d89a', '#ecd08a', '#f5e2ad'])}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    }
    return d;
  },
  orzo: (r) => `<ellipse rx="9" ry="4" fill="${pick(r, ['#f1d89a', '#ecd08a', '#f5e2ad'])}" stroke="#d9b96a" stroke-width="1"/>`,
  rice: () => `<ellipse rx="7" ry="3.5" fill="#fbf8f0" stroke="#e3dccb" stroke-width="1"/>`,
  quinoa: (r) => `<circle r="4" fill="${pick(r, ['#e8d6a8', '#d9c28e', '#f0e2bf'])}"/>`,
  bulgur: (r) => `<circle r="4" fill="${pick(r, ['#d9b46a', '#c9a35a', '#e4c27e'])}"/>`,
  tomato: () => `<circle r="26" fill="#d9412f"/><circle r="26" fill="none" stroke="#b5321f" stroke-width="3"/><path d="M0 -8 l4 6 7 1 -5 5 1 7 -7 -3 -7 3 1 -7 -5 -5 7 -1Z" fill="#4f8a3c"/><ellipse cx="-9" cy="-10" rx="6" ry="3" fill="#fff" opacity=".35"/>`,
  tomatoslice: () => `<circle r="30" fill="#d9412f"/><circle r="21" fill="#e9604a"/><g fill="#f4c9a0">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3" ry="6" transform="rotate(${a}) translate(0 -12)"/>`).join('')}</g>`,
  avocado: () => `<path d="M0 -46 C26 -46 36 10 30 26 C24 44 -24 44 -30 26 C-36 10 -26 -46 0 -46Z" fill="#2f4a1f"/><path d="M0 -40 C21 -40 29 10 24 24 C19 38 -19 38 -24 24 C-29 10 -21 -40 0 -40Z" fill="#b9d36c"/><path d="M0 -30 C14 -30 20 8 16 18 C12 30 -12 30 -16 18 C-20 8 -14 -30 0 -30Z" fill="#d7e69a"/><circle cy="12" r="13" fill="#7a4a24"/>`,
  avocadoslice: () => `<path d="M-40 0 C-30 -16 30 -16 40 0 C30 8 -30 8 -40 0Z" fill="#b9d36c" stroke="#3d5a26" stroke-width="3"/>`,
  salmon: () => `<rect x="-42" y="-22" width="84" height="44" rx="10" fill="#f08a5d"/><g stroke="#fbe3d6" stroke-width="4" opacity=".9">${[-24, -8, 8, 24].map((x) => `<path d="M${x} -20 q-8 20 0 40" fill="none"/>`).join('')}</g><rect x="-42" y="-22" width="84" height="44" rx="10" fill="none" stroke="#d96d42" stroke-width="2"/>`,
  smokedsalmon: () => `<path d="M-40 -10 C-20 -30 20 -30 40 -10 C30 10 20 26 0 18 C-20 26 -30 10 -40 -10Z" fill="#f39a74"/><path d="M-30 -8 C-10 -20 10 -20 30 -8" stroke="#fde2d6" stroke-width="4" fill="none"/>`,
  tuna: () => `<rect x="-16" y="-16" width="32" height="32" rx="5" fill="#c9455a"/><rect x="-16" y="-16" width="32" height="10" rx="4" fill="#d9677a"/>`,
  shrimp: () => `<path d="M-24 6 C-26 -22 20 -28 26 -2 C28 14 14 22 6 14" fill="none" stroke="#f28c6b" stroke-width="16" stroke-linecap="round"/><path d="M-24 6 C-26 -22 20 -28 26 -2" fill="none" stroke="#fbc2a8" stroke-width="4" stroke-dasharray="6 6"/>`,
  egg: () => `<path d="M-40 -6 C-44 -34 -6 -44 14 -36 C42 -28 46 6 30 24 C14 40 -30 38 -38 18 C-42 8 -38 2 -40 -6Z" fill="#fffdf7" stroke="#eee6d5" stroke-width="2"/><circle cx="2" cy="-2" r="17" fill="#f6b62e"/><ellipse cx="-4" cy="-8" rx="5" ry="3" fill="#fff" opacity=".5"/>`,
  scrambled: (r) => `<path d="M-20 -10 C-10 -24 14 -20 18 -6 C28 0 22 18 8 16 C0 26 -20 20 -18 8 C-30 4 -28 -8 -20 -10Z" fill="${pick(r, ['#f7d554', '#f5cd44', '#f9de72'])}"/>`,
  lemon: () => `<circle r="30" fill="#f5d33f"/><circle r="25" fill="#fbe98a"/><g stroke="#f5d33f" stroke-width="3">${[0, 45, 90, 135].map((a) => `<path d="M0 -25 L0 25" transform="rotate(${a})"/>`).join('')}</g>`,
  lime: () => `<circle r="28" fill="#6aa832"/><circle r="23" fill="#c4e07a"/><g stroke="#6aa832" stroke-width="3">${[0, 45, 90, 135].map((a) => `<path d="M0 -23 L0 23" transform="rotate(${a})"/>`).join('')}</g>`,
  beans: (r) => `<ellipse rx="13" ry="8" fill="${pick(r, ['#7d1f22', '#8e2a2c', '#6c1a1d'])}"/><ellipse cx="-4" cy="-3" rx="4" ry="2" fill="#fff" opacity=".25"/>`,
  chickpea: (r) => `<circle r="11" fill="${pick(r, ['#e2c27c', '#d8b468', '#ebcf90'])}"/><path d="M-4 -6 q4 4 8 0" stroke="#b8924a" stroke-width="2" fill="none"/>`,
  edamame: () => `<circle r="10" fill="#7fb24a"/><circle cx="-3" cy="-3" r="3" fill="#b5d98a"/>`,
  peas: () => `<circle r="9" fill="#6fa83a"/><circle cx="-3" cy="-3" r="3" fill="#a9d36e"/>`,
  broccoli: () => `<path d="M-6 10 L-10 40 L10 40 L6 10Z" fill="#9cc46a"/><g fill="#3f7a32">${[[-18, -6, 16], [0, -18, 18], [18, -6, 16], [-8, 6, 14], [10, 6, 14]].map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`).join('')}</g><g fill="#5e9b45">${[[-12, -12, 5], [6, -24, 5], [20, -10, 4]].map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`).join('')}</g>`,
  asparagus: () => `<rect x="-60" y="-6" width="110" height="12" rx="6" fill="#7fb24a"/><path d="M50 -9 C66 -9 70 0 66 0 C70 0 66 9 50 9Z" fill="#5e8f36"/><g stroke="#5e8f36" stroke-width="2">${[-30, -5, 20].map((x) => `<path d="M${x} -6 l6 6"/>`).join('')}</g>`,
  zucchini: () => `<circle r="26" fill="#3f7a32"/><circle r="22" fill="#e9efc4"/><g fill="#d4dc9e">${[0, 60, 120, 180, 240, 300].map((a) => `<circle r="3" transform="rotate(${a}) translate(0 -9)"/>`).join('')}</g>`,
  zoodles: (r) => {
    let d = '';
    for (let i = 0; i < 14; i++) {
      d += `<path d="M${(r() * 220 - 110).toFixed(0)} ${(r() * 220 - 110).toFixed(0)} q${(r() * 120 - 60).toFixed(0)} ${(r() * 120 - 60).toFixed(0)} ${(r() * 200 - 100).toFixed(0)} ${(r() * 200 - 100).toFixed(0)}" stroke="${pick(r, ['#d7e69a', '#c6db82', '#e3eeb1'])}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    }
    return d;
  },
  cucumber: () => `<circle r="24" fill="#4f8a3c"/><circle r="20" fill="#dcebb0"/><g fill="#f4f8e0">${[0, 120, 240].map((a) => `<ellipse rx="3" ry="5" transform="rotate(${a}) translate(0 -8)"/>`).join('')}</g>`,
  carrot: () => `<path d="M-50 -7 L46 -4 C54 -2 54 2 46 4 L-50 7Z" fill="#ee8a2f"/><g stroke="#cf6f1c" stroke-width="2">${[-30, -5, 20].map((x) => `<path d="M${x} -5 l0 10"/>`).join('')}</g>`,
  redcabbage: (r) => `<path d="M-30 0 q15 -${(8 + r() * 6).toFixed(0)} 30 0 t30 0" stroke="#7b2d6b" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  beet: (r) => `<rect x="-15" y="-15" width="30" height="30" rx="5" fill="${pick(r, ['#8e1f4f', '#7a1743', '#9e2a5c'])}"/>`,
  beetslice: () => `<circle r="44" fill="#8e1f4f"/><circle r="36" fill="none" stroke="#b5477a" stroke-width="3"/><circle r="24" fill="none" stroke="#b5477a" stroke-width="3"/>`,
  sweetpotato: (r) => `<rect x="-18" y="-18" width="36" height="36" rx="7" fill="${pick(r, ['#ef9a43', '#f2a854', '#e88e33'])}"/><rect x="-18" y="-18" width="36" height="8" rx="4" fill="#c56b2a" opacity=".6"/>`,
  potato: (r) => `<ellipse rx="26" ry="20" fill="${pick(r, ['#e9c86e', '#f0d27c'])}"/><ellipse rx="26" ry="20" fill="none" stroke="#b98c3c" stroke-width="3"/>`,
  mozzarella: () => `<circle r="34" fill="#fbfaf4" stroke="#e8e4d6" stroke-width="3"/><ellipse cx="-10" cy="-12" rx="10" ry="6" fill="#fff"/>`,
  burrata: () => `<circle r="60" fill="#fbfaf4" stroke="#e8e4d6" stroke-width="4"/><path d="M-30 -10 C-10 -30 20 -26 30 -6" stroke="#ece6d4" stroke-width="5" fill="none"/><path d="M-20 18 C0 8 20 14 28 24" stroke="#ece6d4" stroke-width="4" fill="none"/>`,
  creamcheese: (r) => `<circle r="${(8 + r() * 5).toFixed(0)}" fill="#fffdf5" stroke="#ece6d4" stroke-width="2"/>`,
  parmesan: () => `<rect x="-6" y="-1.5" width="12" height="3" rx="1.5" fill="#f3e7b8"/>`,
  yogurt: () => `<circle r="150" fill="#fbfaf6"/><path d="M-90 -20 C-40 -70 50 -70 100 -10 C60 30 -40 40 -90 -20Z" fill="#f2efe6"/>`,
  hummus: () => `<circle r="140" fill="#e8cf9d"/><path d="M-100 0 C-60 -70 60 -70 100 0 C60 70 -60 70 -100 0Z" fill="none" stroke="#d6b87f" stroke-width="10"/><circle r="40" fill="#c9a24e" opacity=".5"/><circle cx="-10" cy="-6" r="22" fill="#e0b94a" opacity=".7"/>`,
  sauce: (r, color = '#c84a2c') => `<path d="M-150 -20 C-140 -120 120 -150 150 -30 C170 60 80 150 -20 140 C-120 135 -165 70 -150 -20Z" fill="${color}"/>`,
  curry: () => `<circle r="155" fill="#e6a23a"/><circle r="155" fill="url(#shine)"/>`,
  cream: () => `<circle r="150" fill="#f6efd9"/>`,
  bread: (r) => `<rect x="-60" y="-44" width="120" height="88" rx="22" fill="#b97a3c"/><rect x="-52" y="-36" width="104" height="72" rx="18" fill="${pick(r, ['#e2b878', '#e9c58c'])}"/><g fill="#c99a5c">${[[-20, -10], [10, 6], [24, -16], [-8, 18]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`,
  darkbread: () => `<rect x="-58" y="-42" width="116" height="84" rx="10" fill="#3e2a1c"/><rect x="-52" y="-36" width="104" height="72" rx="8" fill="#5a3d27"/><g fill="#7a5638">${[[-20, -10], [10, 6], [24, -16], [-8, 18], [30, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`,
  flatbread: () => `<path d="M-80 0 C-80 -50 80 -50 80 0 C80 40 -80 40 -80 0Z" fill="#e7c48a"/><g fill="#b9844a" opacity=".7">${[[-40, -6], [-10, 10], [20, -14], [50, 4]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="5"/>`).join('')}</g>`,
  wrap: () => `<rect x="-90" y="-38" width="180" height="76" rx="38" fill="#e8c98f"/><ellipse cx="90" rx="20" ry="38" fill="#f2dcae"/><circle cx="90" cy="-8" r="9" fill="#7fb24a"/><circle cx="96" cy="12" r="7" fill="#f39a74"/><circle cx="82" cy="10" r="7" fill="#b9d36c"/>`,
  ricepaper: () => `<rect x="-80" y="-30" width="160" height="60" rx="30" fill="#f3eee4" opacity=".9" stroke="#e2dbcc" stroke-width="2"/><g opacity=".75"><rect x="-60" y="-12" width="120" height="8" rx="4" fill="#ee8a2f"/><rect x="-60" y="0" width="120" height="8" rx="4" fill="#7b2d6b"/><rect x="-60" y="10" width="120" height="6" rx="3" fill="#7fb24a"/></g>`,
  chicken: (r) => `<path d="M-24 -14 C-10 -26 20 -22 26 -6 C32 10 16 24 0 20 C-18 24 -32 6 -24 -14Z" fill="${pick(r, ['#d99a4e', '#c98a40', '#e2a95e'])}"/><path d="M-12 -6 C0 -12 12 -8 16 0" stroke="#a8692b" stroke-width="3" fill="none" opacity=".6"/>`,
  meatball: (r) => `<circle r="20" fill="${pick(r, ['#8a5a3a', '#7a4c30'])}"/><circle cx="-6" cy="-6" r="6" fill="#a87652" opacity=".6"/>`,
  mince: (r) => `<circle r="${(6 + r() * 5).toFixed(0)}" fill="${pick(r, ['#7a3f25', '#8a4a2c', '#6b3620'])}"/>`,
  ham: () => `<path d="M-40 -10 C-30 -30 30 -30 40 -10 C44 10 20 24 0 20 C-20 24 -44 10 -40 -10Z" fill="#e79a9a"/><path d="M-30 -14 C-10 -24 10 -24 30 -14" stroke="#fff" stroke-width="4" fill="none" opacity=".6"/>`,
  cashew: () => `<path d="M-12 -10 C4 -18 16 -4 10 10 C6 18 -4 14 -2 6 C0 0 -8 -2 -12 -10Z" fill="#e9cf98"/>`,
  walnut: () => `<path d="M-14 0 C-14 -14 14 -14 14 0 C14 14 -14 14 -14 0Z" fill="#a8743f"/><path d="M0 -12 L0 12 M-8 -6 q8 6 0 12 M8 -6 q-8 6 0 12" stroke="#7d5129" stroke-width="2" fill="none"/>`,
  seeds: (r) => `<ellipse rx="6" ry="3.5" fill="${pick(r, ['#4f6b33', '#5f7d3d'])}"/>`,
  sesame: () => `<ellipse rx="3" ry="1.8" fill="#f6ecd2"/>`,
  linseed: () => `<ellipse rx="3" ry="1.8" fill="#8a5a33"/>`,
  chia: () => `<circle r="2" fill="#3a3a3a"/>`,
  granola: (r) => `<path d="M-10 -6 C-4 -12 8 -10 10 -2 C12 8 0 12 -6 8 C-12 4 -14 0 -10 -6Z" fill="${pick(r, ['#c99a55', '#b8873f', '#d6aa66'])}"/>`,
  berries: (r) => {
    const c = pick(r, ['#3b3f8f', '#5b2a6e', '#c22d48', '#2f3470']);
    return `<circle r="11" fill="${c}"/><circle cx="-3" cy="-3" r="3" fill="#fff" opacity=".35"/>`;
  },
  raspberry: () => `<g fill="#d9365a">${[[0, 0], [-6, -5], [6, -5], [-6, 5], [6, 5], [0, -9], [0, 9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}</g>`,
  date: () => `<ellipse rx="22" ry="12" fill="#6b3a1f"/><path d="M-14 -2 C-4 -8 6 -8 14 -2" stroke="#8a5230" stroke-width="3" fill="none"/>`,
  banana: () => `<circle r="20" fill="#f7e6a6"/><circle r="15" fill="#fbf0c6"/><circle r="3" fill="#c9b06a"/>`,
  apple: () => `<path d="M-40 0 C-40 -30 40 -30 40 0 L-40 0Z" fill="#fff8e6"/><path d="M-40 0 C-40 -30 40 -30 40 0" fill="none" stroke="#c22d32" stroke-width="6"/><circle cx="0" cy="-10" r="3" fill="#6b3a1f"/>`,
  peanutbutter: () => `<path d="M-40 -10 C-20 -30 30 -24 40 -4 C46 14 14 24 -10 18 C-34 14 -50 4 -40 -10Z" fill="#c98a3c"/>`,
  pomegranate: () => `<path d="M0 -7 L6 -2 L4 6 L-4 6 L-6 -2Z" fill="#b5122f"/><circle cx="-1" cy="-1" r="1.5" fill="#fff" opacity=".5"/>`,
  mint: () => `<path d="M0 -20 C14 -12 14 10 0 20 C-14 10 -14 -12 0 -20Z" fill="#4fa05a"/><path d="M0 -16 L0 16" stroke="#2f7a3c" stroke-width="2"/>`,
  melon: () => `<path d="M-50 10 C-40 -30 40 -30 50 10Z" fill="#f2a065"/><path d="M-50 10 C-40 -30 40 -30 50 10" fill="none" stroke="#9cc46a" stroke-width="7"/>`,
  watermelon: () => `<path d="M-50 10 C-40 -30 40 -30 50 10Z" fill="#e94a5a"/><path d="M-50 10 C-40 -30 40 -30 50 10" fill="none" stroke="#3f7a32" stroke-width="7"/><g fill="#2a2a2a">${[[-14, -6], [4, -12], [18, -2]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3"/>`).join('')}</g>`,
  corn: () => `<rect x="-70" y="-22" width="140" height="44" rx="22" fill="#f2c94c"/><g fill="#e2b331">${Array.from({ length: 12 }, (_, i) => `<circle cx="${-60 + i * 11}" cy="-8" r="4"/><circle cx="${-55 + i * 11}" cy="6" r="4"/>`).join('')}</g><g stroke="#a5671e" stroke-width="3">${[-40, -10, 20, 50].map((x) => `<path d="M${x} -22 l-8 44"/>`).join('')}</g>`,
  aubergine: () => `<circle r="48" fill="#3d2546"/><circle r="42" fill="#efe2c2"/><g fill="#c9b48a">${[0, 60, 120, 180, 240, 300].map((a) => `<circle r="3" transform="rotate(${a}) translate(0 -18)"/>`).join('')}</g><circle r="42" fill="#b8742c" opacity=".35"/>`,
  falafel: () => `<circle r="20" fill="#7a4f22"/><circle r="17" fill="#98652e"/><g fill="#5e8f36">${[[-6, -4], [5, 3], [-2, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`,
  bulette: () => `<ellipse rx="34" ry="28" fill="#c98a4a"/><ellipse rx="28" ry="22" fill="#d9a060"/><g fill="#f6efd9" opacity=".8">${[[-8, -6], [8, 4], [0, 10]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`,
  wakame: (r) => `<path d="M-20 0 C-10 -10 10 10 20 0" stroke="${pick(r, ['#2f7a3c', '#3c8a46'])}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  oil: () => `<circle r="10" fill="#d9c34a" opacity=".55"/>`,
  pepper: () => `<circle r="2" fill="#2a2a2a"/>`,
  cinnamon: () => `<circle r="2.5" fill="#9b5a2a"/>`,
};

function vessel(kind) {
  if (kind === 'bowl') {
    return `<circle cx="${CX + 10}" cy="${CY + 14}" r="330" fill="#000" opacity=".12" filter="url(#blur)"/><circle cx="${CX}" cy="${CY}" r="330" fill="#3d5a80"/><circle cx="${CX}" cy="${CY}" r="300" fill="#2e4766"/><circle cx="${CX}" cy="${CY}" r="270" fill="#f6f3ec"/>`;
  }
  if (kind === 'board') {
    return `<rect x="${CX - 430 + 12}" y="${CY - 290 + 16}" width="860" height="580" rx="40" fill="#000" opacity=".12" filter="url(#blur)"/><rect x="${CX - 430}" y="${CY - 290}" width="860" height="580" rx="40" fill="#c99a62"/><g stroke="#b5864f" stroke-width="3" opacity=".6">${[-200, -100, 0, 100, 200].map((y) => `<path d="M${CX - 400} ${CY + y} q400 ${y > 0 ? 20 : -20} 800 0" fill="none"/>`).join('')}</g>`;
  }
  return `<circle cx="${CX + 10}" cy="${CY + 14}" r="340" fill="#000" opacity=".12" filter="url(#blur)"/><circle cx="${CX}" cy="${CY}" r="340" fill="#fdfcf8"/><circle cx="${CX}" cy="${CY}" r="270" fill="none" stroke="#ece7dc" stroke-width="4"/>`;
}

function glass(layers) {
  // Seitenansicht eines Glases; layers von unten nach oben: [{ color, height }]
  const x0 = CX - 150;
  const width = 300;
  const bottom = CY + 300;
  let y = bottom;
  let body = '';
  for (const layer of layers) {
    y -= layer.height;
    body += `<rect x="${x0}" y="${y}" width="${width}" height="${layer.height}" fill="${layer.color}"/>`;
  }
  return `<ellipse cx="${CX}" cy="${bottom + 18}" rx="190" ry="26" fill="#000" opacity=".15"/>
    <clipPath id="glass"><path d="M${x0} ${CY - 300} L${x0 + width} ${CY - 300} L${x0 + width - 20} ${bottom} L${x0 + 20} ${bottom}Z"/></clipPath>
    <g clip-path="url(#glass)">${body}</g>
    <path d="M${x0} ${CY - 300} L${x0 + width} ${CY - 300} L${x0 + width - 20} ${bottom} L${x0 + 20} ${bottom}Z" fill="#fff" opacity=".12" stroke="#ffffff" stroke-width="6"/>
    <rect x="${CX + 60}" y="${CY - 380}" width="16" height="300" rx="8" fill="#2a2a2a" transform="rotate(12 ${CX + 68} ${CY - 230})"/>
    <path d="M${x0 + 30} ${CY - 260} L${x0 + 46} ${bottom - 40}" stroke="#fff" stroke-width="10" opacity=".35" stroke-linecap="round"/>`;
}

export function render(spec, seedText) {
  const r = rng(seedText);
  const bg = spec.bg ?? '#e9dcc9';
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
  <radialGradient id="shine" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <pattern id="linen" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0 L8 8 M8 0 L0 8" stroke="#000" stroke-width=".6" opacity=".05"/></pattern></defs>
  <rect width="${W}" height="${H}" fill="${bg}"/><rect width="${W}" height="${H}" fill="url(#linen)"/>`;
  if (spec.vessel === 'glass') {
    svg += glass(spec.layers ?? [{ color: '#c9a27a', height: 500 }]);
    for (const item of spec.items ?? []) svg += placeItems(item, r, 140, CY - 330);
  } else {
    svg += vessel(spec.vessel ?? 'plate');
    for (const item of spec.items ?? []) svg += placeItems(item, r, spec.vessel === 'board' ? 380 : 250, CY);
  }
  return svg + '</svg>';
}

function placeItems(item, r, radius, cy) {
  const shape = SHAPES[item.type];
  if (!shape) throw new Error(`Unbekannte Form: ${item.type} (erlaubt: ${Object.keys(SHAPES).join(', ')})`);
  const count = item.count ?? 1;
  const spread = (item.spread ?? 0.7) * radius;
  const scale = item.scale ?? 1;
  const ox = (item.x ?? 0) * radius;
  const oy = (item.y ?? 0) * radius;
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = count === 1 ? 0 : Math.sqrt(r()) * spread;
    const x = CX + ox + Math.cos(a) * d;
    const y = cy + oy + Math.sin(a) * d * (item.flat ?? 1);
    const rot = item.rotate === false ? 0 : r() * 360;
    out += g(x, y, rot, scale * (0.85 + r() * 0.3), shape(r, item.color));
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [specPath, out] = process.argv.slice(2);
  if (!specPath || !out) {
    console.error('Aufruf: npm run illustration -- <spec.json> <ausgabe.jpg>');
    process.exit(1);
  }
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  await sharp(Buffer.from(render(spec, out))).jpeg({ quality: 88, mozjpeg: true }).toFile(out);
  console.log(out);
}
