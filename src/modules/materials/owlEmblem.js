import { RNG } from '../utils/rng.js';

const NAVY = '#13234a';
const NAVY_DARK = '#0b1631';
const GOLD = '#d9a441';
const GOLD_LIGHT = '#f3cf74';

function meander(ctx, x0, y0, width, h, color) {
  const u = h / 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = u * 0.8;
  ctx.lineCap = 'square';
  for (let x = x0; x < x0 + width - h; x += h) {
    ctx.beginPath();
    ctx.moveTo(x, y0 + h);
    ctx.lineTo(x, y0);
    ctx.lineTo(x + 4 * u, y0);
    ctx.lineTo(x + 4 * u, y0 + 3 * u);
    ctx.lineTo(x + 2 * u, y0 + 3 * u);
    ctx.lineTo(x + 2 * u, y0 + 1.6 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y0 + h);
    ctx.lineTo(x + h, y0 + h);
    ctx.stroke();
  }
}

function leaf(ctx, x, y, len, ang) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.22, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.22, 0, 0);
  ctx.fill();
  ctx.restore();
}

function owl(ctx, cx, cy, s) {
  const g = ctx.createLinearGradient(cx - 120 * s, cy - 200 * s, cx + 120 * s, cy + 200 * s);
  g.addColorStop(0, GOLD_LIGHT);
  g.addColorStop(0.55, GOLD);
  g.addColorStop(1, '#a7741f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 40 * s, 112 * s, 150 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 115 * s, 104 * s, 84 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 62 * s, cy - 180 * s);
    ctx.lineTo(cx + side * 98 * s, cy - 232 * s);
    ctx.lineTo(cx + side * 102 * s, cy - 150 * s);
    ctx.fill();
  }
  ctx.fillStyle = NAVY;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * 46 * s, cy - 118 * s, 40 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = GOLD_LIGHT;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * 46 * s, cy - 118 * s, 27 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = NAVY_DARK;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * 46 * s, cy - 118 * s, 13 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.moveTo(cx - 13 * s, cy - 92 * s);
  ctx.lineTo(cx + 13 * s, cy - 92 * s);
  ctx.lineTo(cx, cy - 56 * s);
  ctx.fill();
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 7 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 95 * s, cy - 168 * s);
  ctx.quadraticCurveTo(cx, cy - 130 * s, cx + 95 * s, cy - 168 * s);
  ctx.stroke();
  ctx.lineWidth = 5 * s;
  for (let r = 0; r < 5; r++) {
    for (let c = -2 + (r % 2) * 0.5; c <= 2; c++) {
      const x = cx + c * 30 * s, y = cy - 20 * s + r * 32 * s;
      if (Math.abs(x - cx) > (90 - r * 6) * s) continue;
      ctx.beginPath();
      ctx.moveTo(x - 11 * s, y);
      ctx.quadraticCurveTo(x, y + 14 * s, x + 11 * s, y);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 6 * s;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 70 * s, cy - 50 * s);
    ctx.bezierCurveTo(cx + side * 120 * s, cy + 20 * s, cx + side * 110 * s, cy + 140 * s, cx + side * 60 * s, cy + 185 * s);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      const y = cy + 40 * s + k * 34 * s;
      ctx.moveTo(cx + side * 108 * s, y);
      ctx.lineTo(cx + side * 80 * s, y + 22 * s);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 170 * s, cy + 205 * s);
  ctx.quadraticCurveTo(cx, cy + 230 * s, cx + 170 * s, cy + 200 * s);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = cx - 160 * s + t * 320 * s, y = cy + 207 * s + Math.sin(t * Math.PI) * 18 * s;
    leaf(ctx, x, y, 46 * s, -0.9 + (i % 2) * 1.8 + 0.3);
  }
  ctx.fillStyle = GOLD_LIGHT;
  for (const side of [-1, 1]) {
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.ellipse(cx + side * 34 * s + k * 12 * s, cy + 196 * s, 6 * s, 14 * s, k * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function letters(ctx, cx, cy, h) {
  const w = h * 0.7, gap = h * 0.45;
  const x0 = cx - (3 * w + 2 * gap) / 2;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = h * 0.16;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(x0, cy + h / 2); ctx.lineTo(x0 + w / 2, cy - h / 2); ctx.lineTo(x0 + w, cy + h / 2);
  ctx.moveTo(x0 + w * 0.22, cy + h * 0.1); ctx.lineTo(x0 + w * 0.78, cy + h * 0.1);
  const x1 = x0 + w + gap;
  ctx.moveTo(x1 + w, cy); ctx.ellipse(x1 + w / 2, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.moveTo(x1 + w * 0.25, cy); ctx.lineTo(x1 + w * 0.75, cy);
  const x2 = x1 + w + gap;
  ctx.moveTo(x2 + w, cy - h / 2); ctx.lineTo(x2, cy - h / 2); ctx.lineTo(x2, cy + h / 2); ctx.lineTo(x2 + w, cy + h / 2);
  ctx.moveTo(x2, cy); ctx.lineTo(x2 + w * 0.8, cy);
  ctx.stroke();
}

export function drawOwlBanner(width = 512, height = 1024, seed = 7) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const s = width / 512;
  const tipY = height - 120 * s;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, tipY);
  ctx.lineTo(width / 2, height - 8 * s);
  ctx.lineTo(0, tipY);
  ctx.closePath();
  ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#1a2f5e');
  bg.addColorStop(1, NAVY_DARK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const img = ctx.getImageData(0, 0, width, height);
  const rng = new RNG(seed);
  for (let y = 0; y < height; y++) {
    const row = Math.sin(y * 1.7) * 4;
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4;
      const v = (rng.next() - 0.5) * 14 + row + Math.sin(x * 2.3) * 3;
      img.data[k] += v; img.data[k + 1] += v; img.data[k + 2] += v;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 14 * s;
  ctx.beginPath();
  ctx.moveTo(22 * s, 0); ctx.lineTo(22 * s, tipY - 6 * s); ctx.lineTo(width / 2, height - 40 * s);
  ctx.lineTo(width - 22 * s, tipY - 6 * s); ctx.lineTo(width - 22 * s, 0);
  ctx.stroke();
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(44 * s, 0); ctx.lineTo(44 * s, tipY - 22 * s); ctx.lineTo(width / 2, height - 70 * s);
  ctx.lineTo(width - 44 * s, tipY - 22 * s); ctx.lineTo(width - 44 * s, 0);
  ctx.stroke();
  meander(ctx, 60 * s, 58 * s, width - 120 * s, 40 * s, GOLD);
  owl(ctx, width / 2, 470 * s, 0.95 * s);
  letters(ctx, width / 2, 800 * s, 58 * s);
  ctx.fillStyle = GOLD;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(width / 2 + (i - 3) * 22 * s, 870 * s - Math.abs(i - 3) * 14 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return canvas;
}
