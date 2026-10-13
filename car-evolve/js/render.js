'use strict';
// ============================================================
//  Zeichnen: Hintergrund, Gelände, Fahrzeug, Pickups, HUD
// ============================================================

const cam = { x: 0, y: 0, z: 1 };

function paintColor(time) {
  const p = PAINTS.find(p => p.id === save.paint) || PAINTS[0];
  if (p.c === 'rainbow') return `hsl(${((time || 0) * 60) % 360},85%,55%)`;
  return p.c;
}
function shade(hex, f) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// ---------- Fahrzeug (lokale Koordinaten) ----------
// wheels: [{x,y,spin}] in lokalen Koordinaten relativ zum Chassis-Ursprung, oder null (Ruheposition)
function drawCarLocal(ctx, v, stage, color, time, wheels, opts) {
  opts = opts || {};
  const body = v.body;
  const gold = stage >= 4;
  // Unterbodenleuchten
  if (stage >= 4 || v.glow) {
    const gl = ctx.createRadialGradient(0, 18, 4, 0, 18, 80);
    const hue = v.glow ? (time * 80) % 360 : 190;
    gl.addColorStop(0, `hsla(${hue},100%,60%,0.55)`); gl.addColorStop(1, `hsla(${hue},100%,60%,0)`);
    ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(0, 22, 80, 18, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Aura ab Stufe 5
  if (stage >= 5) {
    ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 5);
    ctx.fillStyle = stage >= 6 ? '#e040fb' : '#ffd740';
    ctx.beginPath(); ctx.ellipse(0, -6, 82, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // Federbeine
  ctx.strokeStyle = '#555'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  v.wheels.forEach((p, i) => {
    const w = wheels ? wheels[i] : { x: p[0], y: p[1] };
    ctx.beginPath(); ctx.moveTo(p[0], p[1] - 14); ctx.lineTo(w.x, w.y); ctx.stroke();
  });
  // Spoiler
  if (stage >= 2) {
    const r = body[1];
    ctx.fillStyle = '#222'; ctx.fillRect(r[0] + 2, r[1] - 14, 4, 12);
    ctx.fillStyle = stage >= 4 ? '#ffd700' : shade(color, -0.35);
    ctx.beginPath(); ctx.moveTo(r[0] - 8, r[1] - 16); ctx.lineTo(r[0] + 18, r[1] - 14); ctx.lineTo(r[0] + 16, r[1] - 10); ctx.lineTo(r[0] - 8, r[1] - 11); ctx.closePath(); ctx.fill();
  }
  // Auspuff
  if (stage >= 3 || v.rocket) {
    const r = body[0];
    ctx.fillStyle = '#9e9e9e'; ctx.fillRect(r[0] - 8, r[1] - 6, 12, 6);
    if (v.rocket) { ctx.fillStyle = '#607d8b'; ctx.beginPath(); ctx.arc(r[0] - 2, r[1] - 12, 9, 0, Math.PI * 2); ctx.fill(); }
  }
  // Fahrer (Kopf mit Helm)
  const hd = v.head;
  ctx.fillStyle = '#ffcc80'; ctx.beginPath(); ctx.arc(hd[0], hd[1] + 4, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = opts.helmet || '#fafafa';
  ctx.beginPath(); ctx.arc(hd[0], hd[1], 9.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  ctx.fillStyle = '#263238'; ctx.fillRect(hd[0] + 1, hd[1] - 1, 8, 4);
  // Karosserie
  const minY = Math.min(...body.map(p => p[1])), maxY = Math.max(...body.map(p => p[1]));
  const grd = ctx.createLinearGradient(0, minY, 0, maxY);
  grd.addColorStop(0, shade(color, 0.3)); grd.addColorStop(0.5, color); grd.addColorStop(1, shade(color, -0.35));
  ctx.fillStyle = grd; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  ctx.beginPath(); body.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Fenster
  const roof = body.filter(p => p[1] <= minY + 6);
  if (roof.length >= 2) {
    const xs = roof.map(p => p[0]); const x0 = Math.min(...xs), x1 = Math.max(...xs);
    ctx.fillStyle = 'rgba(150,220,255,0.75)';
    ctx.beginPath(); ctx.moveTo(x0 - 6, -12); ctx.lineTo(x0 + 3, minY + 4); ctx.lineTo(x1 - 3, minY + 4); ctx.lineTo(x1 + 7, -12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, minY + 4); ctx.lineTo((x0 + x1) / 2, -12); ctx.stroke();
  }
  // Rennstreifen
  if (stage >= 3) {
    ctx.save(); ctx.beginPath(); body.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
    ctx.fillStyle = stage >= 5 ? 'rgba(255,215,0,0.85)' : 'rgba(255,255,255,0.8)';
    ctx.fillRect(-80, -4, 160, 4); ctx.fillRect(-80, 2, 160, 2);
    if (stage >= 5) { // Flammen-Dekor
      ctx.fillStyle = 'rgba(255,87,34,0.85)';
      ctx.beginPath(); ctx.moveTo(10, 10); for (let i = 0; i < 5; i++) { ctx.quadraticCurveTo(-4 - i * 10, 4 - (i % 2) * 8, -12 - i * 10, 10); } ctx.lineTo(10, 14); ctx.fill();
    }
    ctx.restore();
  }
  // Rost bei Schrottkarre
  if (stage === 0) {
    ctx.fillStyle = 'rgba(121,72,40,0.6)';
    [[-30, 2, 5], [22, 4, 4], [-8, -6, 3], [40, -2, 3]].forEach(r => { ctx.beginPath(); ctx.arc(r[0], r[1], r[2], 0, Math.PI * 2); ctx.fill(); });
  }
  // Scheinwerfer
  const front = body.reduce((a, p) => p[0] > a[0] ? p : a, body[0]);
  ctx.fillStyle = '#fff59d'; ctx.beginPath(); ctx.arc(front[0] - 4, front[1] - 3, 3.5, 0, Math.PI * 2); ctx.fill();
  // Räder
  v.wheels.forEach((p, i) => {
    const w = wheels ? wheels[i] : { x: p[0], y: p[1], spin: 0 };
    drawWheel(ctx, w.x, w.y, v.wheelR, w.spin || 0, gold, v.glow);
  });
}
function drawWheel(ctx, x, y, r, spin, gold, glow) {
  ctx.fillStyle = '#1c1c1c'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) { const a = spin + i * Math.PI / 5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
  ctx.fillStyle = glow ? '#18ffff' : gold ? '#ffd700' : '#b0bec5'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = gold ? '#b8860b' : '#607d8b'; ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) { const a = spin + i * Math.PI * 2 / 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52); ctx.stroke(); }
  ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.arc(x, y, r * 0.15, 0, Math.PI * 2); ctx.fill();
}

// ---------- Hintergrund ----------
let starCache = null;
function drawBackground(ctx, W, H, world, t) {
  const c = world.col;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, c.sky1); sky.addColorStop(1, c.sky2);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  if (c.stars) {
    if (!starCache) { starCache = []; for (let i = 0; i < 140; i++) starCache.push([hash(i, 3), hash(i, 5), hash(i, 7)]); }
    for (const s of starCache) {
      const x = ((s[0] * W * 2 - cam.x * 0.02) % W + W) % W, y = s[1] * H * 0.75;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + s[2]) + s[0] * 10));
      ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1 + s[2] * 2, 1 + s[2] * 2);
    }
    ctx.globalAlpha = 1;
  }
  // Sonne / Planet
  ctx.fillStyle = c.stars ? 'rgba(255,255,255,0.9)' : 'rgba(255,250,220,0.85)';
  ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, Math.min(W, H) * 0.07, 0, Math.PI * 2); ctx.fill();
  if (world.id === 'moon') { ctx.fillStyle = '#2e7dd7'; ctx.beginPath(); ctx.arc(W * 0.2, H * 0.22, Math.min(W, H) * 0.09, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(W * 0.19, H * 0.2, Math.min(W, H) * 0.04, 0, Math.PI * 2); ctx.fill(); }
  if (c.rainbow) {
    for (let i = 0; i < 7; i++) { ctx.strokeStyle = `hsla(${i * 50},90%,60%,0.35)`; ctx.lineWidth = H * 0.025; ctx.beginPath(); ctx.arc(W * 0.5, H * 1.1, H * (0.75 - i * 0.025), Math.PI, 0); ctx.stroke(); }
  }
  // Wolken
  if (!c.stars) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 6; i++) {
      const x = ((hash(i, 9) * W * 3 - cam.x * 0.05 - t * 8) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * 0.25;
      const y = H * (0.08 + hash(i, 11) * 0.25), s = 30 + hash(i, 13) * 40;
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.arc(x + s, y + 6, s * 0.8, 0, Math.PI * 2); ctx.arc(x - s, y + 8, s * 0.7, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Berge (Parallax)
  layer(ctx, W, H, c.far, 0.12, H * 0.55, H * 0.25, 31, 260);
  layer(ctx, W, H, c.mid, 0.3, H * 0.7, H * 0.18, 37, 140);
  if (c.embers) {
    for (let i = 0; i < 30; i++) {
      const x = ((hash(i, 21) * W - t * 20 * (0.5 + hash(i, 22))) % W + W) % W;
      const y = H - ((t * 40 * (0.5 + hash(i, 23)) + hash(i, 24) * H) % H);
      ctx.fillStyle = `rgba(255,${120 + hash(i, 25) * 100 | 0},0,0.8)`; ctx.fillRect(x, y, 3, 3);
    }
  }
  if (c.snow) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 50; i++) {
      const x = ((hash(i, 41) * W + Math.sin(t + i) * 20 - cam.x * 0.3 * cam.z) % W + W) % W;
      const y = ((t * 50 * (0.6 + hash(i, 42)) + hash(i, 43) * H) % H);
      ctx.beginPath(); ctx.arc(x, y, 1.5 + hash(i, 44) * 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function layer(ctx, W, H, col, par, base, amp, seed, scale) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 20; sx += 20) {
    const wx = (cam.x * par * cam.z + sx) / scale;
    const y = base - (noise1(wx, seed) * 0.6 + noise1(wx * 2.7, seed + 1) * 0.25 + 0.4) * amp;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

// ---------- Welt ----------
function drawWorld(ctx, W, H, run, t) {
  const T = run.terrain, world = run.world, c = world.col;
  const z = cam.z;
  const x0 = cam.x - W / 2 / z - 40, x1 = cam.x + W / 2 / z + 40;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
  if (run.shake > 0) ctx.translate((Math.random() - 0.5) * run.shake, (Math.random() - 0.5) * run.shake);
  const bottom = cam.y + H / 2 / z + 50;

  // Deko
  const d0 = Math.floor(x0 / (3 * PX)), d1 = Math.ceil(x1 / (3 * PX));
  for (let i = Math.max(d0, 1); i <= d1; i++) {
    const r = hash(i, T.seed + 77); if (r > 0.3) continue;
    const x = i * 3 * PX + r * 40; drawDeco(ctx, c.deco, x, T.groundY(x) + 4, 0.7 + hash(i, T.seed + 78) * 0.6, t, i);
  }
  // Meilensteine & Rekord
  const m0 = Math.max(1, Math.floor((x0 - run.startX) / PX / 250)), m1 = Math.floor((x1 - run.startX) / PX / 250);
  for (let k = m0; k <= m1; k++) {
    const x = run.startX + k * 250 * PX, y = T.groundY(x);
    ctx.fillStyle = '#5d4037'; ctx.fillRect(x - 3, y - 70, 6, 70);
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 32, y - 92, 64, 26); ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(x - 32, y - 92, 64, 26);
    ctx.fillStyle = '#222'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(k * 250 + ' m', x, y - 74);
  }
  if (run.prevBest > 5) {
    const x = run.startX + run.prevBest * PX;
    if (x > x0 && x < x1) {
      const y = T.groundY(x);
      ctx.fillStyle = '#eee'; ctx.fillRect(x - 2, y - 120, 4, 120);
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(x + 2, y - 120); ctx.lineTo(x + 52, y - 106); ctx.lineTo(x + 2, y - 92); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('REKORD', x + 6, y - 102);
    }
  }
  // Gelände
  const s = T.seg, i0 = Math.floor(x0 / s), i1 = Math.ceil(x1 / s);
  ctx.beginPath(); ctx.moveTo(i0 * s, bottom);
  for (let i = i0; i <= i1; i++) ctx.lineTo(i * s, T.Y(i));
  ctx.lineTo(i1 * s, bottom); ctx.closePath();
  const gg = ctx.createLinearGradient(0, cam.y - H / 2 / z, 0, bottom);
  gg.addColorStop(0, c.g1); gg.addColorStop(1, c.g2);
  ctx.fillStyle = gg; ctx.fill();
  // Gesteinsflecken
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = Math.floor(i0 / 4); i <= i1 / 4; i++) {
    const x = i * s * 4 + hash(i, 5) * 40, y = T.groundY(x) + 30 + hash(i, 6) * 120;
    ctx.beginPath(); ctx.arc(x, y, 4 + hash(i, 7) * 10, 0, Math.PI * 2); ctx.fill();
  }
  // Oberfläche
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (c.rainbow) {
    for (let i = i0; i < i1; i++) {
      ctx.strokeStyle = `hsl(${(i * 6 + t * 60) % 360},90%,60%)`; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(i * s, T.Y(i) + 5); ctx.lineTo((i + 1) * s, T.Y(i + 1) + 5); ctx.stroke();
    }
  } else {
    ctx.strokeStyle = c.top; ctx.lineWidth = 16;
    ctx.beginPath(); for (let i = i0; i <= i1; i++) ctx.lineTo(i * s, T.Y(i) + 6); ctx.stroke();
    ctx.strokeStyle = c.top2; ctx.lineWidth = 4;
    ctx.beginPath(); for (let i = i0; i <= i1; i++) ctx.lineTo(i * s, T.Y(i) + 1); ctx.stroke();
  }
  // Pickups
  const P = run.pickups;
  for (let i = run.pIdx; i < P.length; i++) {
    const p = P[i]; if (p.x > x1) break; if (p.taken || p.x < x0) continue;
    drawPickup(ctx, p, t);
  }
  // Partikel (hinter Auto)
  for (const p of run.particles) {
    const a = p.fade ? 1 - p.t / p.life : 1;
    ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = p.col;
    if (p.star) drawStar(ctx, p.x, p.y, p.size, p.size / 2.2);
    else if (p.coin) { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  // Auto
  const car = run.car;
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.a);
  const ca = Math.cos(-car.a), sa = Math.sin(-car.a);
  const wl = car.wheels.map(w => { const dx = w.x - car.x, dy = w.y - car.y; return { x: dx * ca - dy * sa, y: dx * sa + dy * ca, spin: w.spin }; });
  drawCarLocal(ctx, car.v, evoStage(car.v.id), paintColor(t), t, wl);
  ctx.restore();
  ctx.restore();
}

function drawStar(ctx, x, y, R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

function drawPickup(ctx, p, t) {
  const bob = Math.sin(t * 3 + p.x * 0.01) * 4;
  switch (p.t) {
    case 'coin': {
      const col = ['#ffd54f', '#d7894a', '#cfd8dc', '#ffd54f', '#80deea'][p.tier];
      const sx = Math.abs(Math.cos(t * 3 + p.x * 0.02));
      ctx.fillStyle = shade(col, -0.3); ctx.beginPath(); ctx.ellipse(p.x, p.y + bob, 13 * sx + 2, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(p.x, p.y + bob, 10 * sx + 1, 10, 0, 0, Math.PI * 2); ctx.fill();
      if (p.tier >= 3) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6; ctx.fillRect(p.x - 2 * sx, p.y + bob - 6, 3 * sx, 12); ctx.globalAlpha = 1; }
      break;
    }
    case 'fuel': {
      const y = p.y + bob;
      ctx.fillStyle = '#d32f2f'; ctx.strokeStyle = '#7f0000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - 15, y - 18, 30, 36, 5) : ctx.rect(p.x - 15, y - 18, 30, 36); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffeb3b'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FUEL', p.x, y + 5);
      ctx.fillStyle = '#424242'; ctx.fillRect(p.x + 4, y - 26, 8, 9);
      break;
    }
    case 'gem': {
      const y = p.y + bob;
      ctx.fillStyle = '#4dd0e1'; ctx.strokeStyle = '#006064'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, y - 16); ctx.lineTo(p.x + 14, y - 4); ctx.lineTo(p.x, y + 16); ctx.lineTo(p.x - 14, y - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(p.x, y - 16); ctx.lineTo(p.x + 5, y - 4); ctx.lineTo(p.x - 5, y - 4); ctx.fill();
      break;
    }
    case 'nitro': {
      const y = p.y + bob;
      ctx.fillStyle = '#1e88e5'; ctx.fillRect(p.x - 9, y - 16, 18, 32); ctx.fillStyle = '#90caf9'; ctx.fillRect(p.x - 4, y - 24, 8, 8);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N₂O', p.x, y + 4);
      break;
    }
    case 'star': ctx.fillStyle = '#ffeb3b'; ctx.strokeStyle = '#f57f17'; drawStar(ctx, p.x, p.y + bob, 18, 8); ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#e65100'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('x2', p.x, p.y + bob + 4); break;
    case 'pad': {
      ctx.fillStyle = 'rgba(0,229,255,0.35)';
      for (let k = 0; k < p.len; k += 30) {
        const x = p.x + k, y = run_groundY(x);
        ctx.fillStyle = `hsla(${(t * 200 + k) % 360},100%,60%,0.85)`;
        ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x + 14, y - 8); ctx.lineTo(x, y - 14); ctx.lineTo(x + 6, y - 8); ctx.closePath(); ctx.fill();
      }
      break;
    }
  }
}
let run_groundY = () => 0;

function drawDeco(ctx, type, x, y, s, t, i) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  switch (type) {
    case 'tree':
      ctx.fillStyle = '#6d4c41'; ctx.fillRect(-5, -60, 10, 60);
      ctx.fillStyle = '#388e3c'; ctx.beginPath(); ctx.arc(0, -70, 30, 0, Math.PI * 2); ctx.arc(-20, -55, 20, 0, Math.PI * 2); ctx.arc(20, -55, 20, 0, Math.PI * 2); ctx.fill();
      break;
    case 'pine':
      ctx.fillStyle = '#5d4037'; ctx.fillRect(-4, -20, 8, 20);
      ctx.fillStyle = '#2e5d3a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-28 + k * 6, -15 - k * 25); ctx.lineTo(0, -55 - k * 25); ctx.lineTo(28 - k * 6, -15 - k * 25); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-8, -88); ctx.lineTo(0, -105); ctx.lineTo(8, -88); ctx.fill();
      break;
    case 'cactus':
      ctx.fillStyle = '#558b2f'; ctx.fillRect(-7, -70, 14, 70); ctx.fillRect(-25, -45, 8, 25); ctx.fillRect(-25, -25, 20, 8); ctx.fillRect(17, -55, 8, 25); ctx.fillRect(5, -35, 20, 8);
      break;
    case 'palm':
      ctx.strokeStyle = '#795548'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -50, 0, -100); ctx.stroke();
      ctx.fillStyle = '#2e7d32';
      for (let k = 0; k < 5; k++) { ctx.save(); ctx.translate(0, -100); ctx.rotate(-2.6 + k * 0.9 + Math.sin(t + i) * 0.05); ctx.beginPath(); ctx.ellipse(28, 0, 30, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      break;
    case 'rock':
      ctx.fillStyle = 'rgba(80,40,20,0.8)'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-20, -30); ctx.lineTo(5, -45); ctx.lineTo(28, -20); ctx.lineTo(32, 0); ctx.fill();
      break;
    case 'crystal':
      ctx.fillStyle = `hsla(${(i * 47) % 360},80%,65%,0.8)`;
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-6, -45); ctx.lineTo(0, -55); ctx.lineTo(6, -45); ctx.lineTo(10, 0); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(16, -28); ctx.lineTo(22, -24); ctx.lineTo(16, 0); ctx.fill();
      break;
    case 'lava':
      ctx.fillStyle = '#1b0d0a'; ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(-10, -40); ctx.lineTo(10, -42); ctx.lineTo(25, 0); ctx.fill();
      ctx.fillStyle = `rgba(255,${100 + Math.sin(t * 4 + i) * 60 | 0},0,0.9)`; ctx.fillRect(-3, -40, 6, 40);
      break;
    case 'building': {
      const h = 80 + (i * 37 % 90);
      ctx.fillStyle = '#140a2a'; ctx.fillRect(-25, -h, 50, h);
      for (let yy = -h + 10; yy < -10; yy += 16) for (let xx = -18; xx < 20; xx += 14) {
        ctx.fillStyle = hash(xx * 7 + yy, i) < 0.5 ? '#ff2bd6' : '#3df2ff'; ctx.globalAlpha = 0.7; ctx.fillRect(xx, yy, 7, 8);
      }
      ctx.globalAlpha = 1; break;
    }
    case 'lollipop':
      ctx.fillStyle = '#fff'; ctx.fillRect(-3, -70, 6, 70);
      ctx.fillStyle = `hsl(${(i * 67) % 360},85%,65%)`; ctx.beginPath(); ctx.arc(0, -80, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -80, 12, 0, Math.PI * 1.5); ctx.stroke();
      break;
    case 'star':
      ctx.fillStyle = `hsla(${(i * 50 + t * 40) % 360},90%,65%,0.9)`; drawStar(ctx, 0, -50 - Math.sin(t * 2 + i) * 10, 16, 7);
      break;
  }
  ctx.restore();
}

// ---------- HUD ----------
function drawHUD(ctx, W, H, run, t, dpr) {
  ctx.save(); ctx.scale(dpr, dpr);
  const w = W / dpr, h = H / dpr;
  const u = Math.min(1.25, Math.max(0.8, h / 400));
  ctx.textBaseline = 'alphabetic';
  // Distanz
  ctx.textAlign = 'left'; ctx.font = `900 ${30 * u}px sans-serif`;
  txtOutline(ctx, `${Math.max(0, Math.floor(run.dist))} m`, 14, 38 * u, '#fff');
  ctx.font = `bold ${13 * u}px sans-serif`;
  txtOutline(ctx, `Rekord ${Math.floor(Math.max(run.prevBest, run.maxDist))} m · ${run.world.name}`, 14, 56 * u, '#e0e0e0');
  // Tank
  const fx = 14, fy = 66 * u, fw = 170 * u, fh = 16 * u, fr = run.fuel / run.fuelMax;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, fx - 2, fy - 2, fw + 4, fh + 4, 6); ctx.fill();
  ctx.fillStyle = fr > 0.4 ? '#66bb6a' : fr > 0.2 ? '#ffa726' : (Math.sin(t * 12) > 0 ? '#ef5350' : '#b71c1c');
  roundRect(ctx, fx, fy, Math.max(0, fw * fr), fh, 5); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${11 * u}px sans-serif`; ctx.fillText('⛽ ' + Math.ceil(fr * 100) + '%', fx + 6, fy + fh - 4 * u);
  // Nitro
  let nx = 14; const ny = fy + fh + 8 * u;
  for (let i = 0; i < run.nitro; i++) { ctx.fillStyle = '#1e88e5'; roundRect(ctx, nx, ny, 12 * u, 20 * u, 3); ctx.fill(); ctx.fillStyle = '#90caf9'; ctx.fillRect(nx + 3 * u, ny - 4 * u, 6 * u, 4 * u); nx += 16 * u; }
  if (run.helmets > 0) { ctx.font = `${16 * u}px sans-serif`; ctx.fillText('⛑️'.repeat(run.helmets), nx + 4, ny + 16 * u); }
  // Münzen
  ctx.textAlign = 'center'; ctx.font = `900 ${24 * u}px sans-serif`;
  txtOutline(ctx, '🪙 ' + fmt(run.totalCoins()) + (run.gems ? `  💎 ${run.gems}` : ''), w / 2, 34 * u, '#ffd54f');
  if (run.x2T > 0) { ctx.font = `bold ${14 * u}px sans-serif`; txtOutline(ctx, `x2 Münzen ${Math.ceil(run.x2T)}s`, w / 2, 54 * u, '#fff176'); }
  if (run.mod) { ctx.font = `bold ${13 * u}px sans-serif`; txtOutline(ctx, `★ ${run.mod.name}: ${run.mod.desc}`, w / 2, (run.x2T > 0 ? 72 : 54) * u, '#ce93d8'); }
  // Tacho
  ctx.textAlign = 'right'; ctx.font = `bold ${16 * u}px sans-serif`;
  txtOutline(ctx, Math.round(run.car.speed() / PX * 3.6) + ' km/h', w - 70, 34 * u, '#fff');
  // Flug-Anzeige
  if (run.airborne && run.airT > 0.6) { ctx.textAlign = 'center'; ctx.font = `bold ${16 * u}px sans-serif`; txtOutline(ctx, `✈ ${run.airT.toFixed(1)}s`, w / 2, h * 0.32, '#b388ff'); }
  // Popups
  ctx.textAlign = 'center';
  let py = h * 0.22;
  for (const p of run.popups) {
    const a = p.t < 0.2 ? p.t / 0.2 : p.t > 1.6 ? Math.max(0, 1 - (p.t - 1.6) / 0.6) : 1;
    ctx.globalAlpha = a; const sc = p.big ? 1 + Math.max(0, 0.3 - p.t) : 1;
    ctx.font = `900 ${(p.big ? 22 : 17) * u * sc}px sans-serif`;
    txtOutline(ctx, p.text, w / 2, py - p.t * 12, p.color); py += (p.big ? 30 : 24) * u;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function txtOutline(ctx, s, x, y, col) {
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round';
  ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
