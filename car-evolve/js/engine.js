'use strict';
// ============================================================
//  Physik, Gelände, Pickups und Spiellauf
// ============================================================

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function hash(n, seed) {
  let x = Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function noise1(x, seed) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
}

// ---------------- Gelände ----------------
class Terrain {
  constructor(world, seed) {
    this.w = world; this.t = world.terrain; this.seed = seed | 0;
    this.seg = 20; this.ys = [];
  }
  // Höhe (px, positiv = oben) bei Meter m
  hAt(m) {
    const t = this.t, s = this.seed;
    if (m < 0) return -m * PX * 1.2; // Wand hinter dem Start
    const fade = clamp((m - 12) / 45, 0, 1);
    const diff = 1 + m / t.growth;
    const f = t.freq;
    let h = noise1(m * f / 55, s) + noise1(m * f / 17, s + 11) * 0.38 * t.rough + noise1(m * f / 6, s + 23) * 0.1 * t.rough;
    h *= t.amp * diff * fade;
    h += noise1(m / 420, s + 5) * t.amp * 2.2 * fade;
    // Rampen
    if (t.ramps > 0) {
      const B = 75, b = Math.floor(m / B);
      if (b >= 1 && hash(b, s + 31) < t.ramps) {
        const L = 9 + hash(b, s + 37) * 9;
        const H = (1.8 + hash(b, s + 41) * 2.6) * PX * Math.min(2.2, 0.8 + m / 1500);
        const p0 = b * B + 20 + hash(b, s + 43) * 25;
        const d = m - p0;
        if (d > 0 && d < L) { const q = d / L; h += H * q * q; }
        else if (d >= L && d < L + 0.7) h += H * (1 - (d - L) / 0.7);
      }
    }
    // Krater
    if (t.craters > 0) {
      const B = 55, b = Math.floor(m / B);
      if (b >= 1 && hash(b, s + 51) < t.craters) {
        const R = 6 + hash(b, s + 53) * 10, c = b * B + 27;
        const D = R * PX * 0.22 * (0.7 + hash(b, s + 57) * 0.6);
        const d = Math.abs(m - c) / R;
        if (d < 1) h -= D * (1 - d * d);
        else if (d < 1.35) h += D * 0.25 * Math.sin((d - 1) / 0.35 * Math.PI);
      }
    }
    return h;
  }
  Y(i) {
    if (i < 0) return -this.hAt(i * this.seg / PX);
    while (this.ys.length <= i) this.ys.push(-this.hAt(this.ys.length * this.seg / PX));
    return this.ys[i];
  }
  groundY(x) {
    const i = Math.floor(x / this.seg), f = x / this.seg - i;
    return lerp(this.Y(i), this.Y(i + 1), f);
  }
  normal(x) {
    const i = Math.floor(x / this.seg);
    const dy = this.Y(i + 1) - this.Y(i), dx = this.seg, l = Math.hypot(dx, dy);
    return { x: dy / l, y: -dx / l };
  }
  // Kreis gegen Polylinie: tiefster Kontakt
  circleContact(cx, cy, r) {
    const seg = this.seg;
    const i0 = Math.floor((cx - r) / seg), i1 = Math.floor((cx + r) / seg);
    let best = null;
    for (let i = i0; i <= i1; i++) {
      const x0 = i * seg, y0 = this.Y(i), x1 = x0 + seg, y1 = this.Y(i + 1);
      const ex = x1 - x0, ey = y1 - y0, l2 = ex * ex + ey * ey;
      let t = ((cx - x0) * ex + (cy - y0) * ey) / l2; t = clamp(t, 0, 1);
      const px = x0 + ex * t, py = y0 + ey * t;
      let dx = cx - px, dy = cy - py; let d = Math.hypot(dx, dy);
      // Mittelpunkt unter der Linie? -> Segmentnormale verwenden
      const side = ex * (cy - y0) - ey * (cx - x0); // >0: unterhalb
      let nx, ny, pen;
      if (side > 0) {
        const l = Math.sqrt(l2); nx = ey / l; ny = -ex / l; pen = r + d;
      } else {
        if (d >= r) continue;
        if (d < 1e-6) { const l = Math.sqrt(l2); nx = ey / l; ny = -ex / l; } else { nx = dx / d; ny = dy / d; }
        pen = r - d;
      }
      if (!best || pen > best.pen) best = { pen, nx, ny };
    }
    return best;
  }
}

// ---------------- Pickups ----------------
// Typen: coin, fuel, gem, nitro, star (x2), pad (Boost-Pad)
function genPickups(run, chunk) {
  const T = run.terrain, s = T.seed + 1000, w = run.world;
  const m0 = chunk * 50, out = run.pickups;
  if (chunk < 1) return;
  // Münzgruppen
  if (hash(chunk, s) < 0.8) {
    const n = 5 + Math.floor(hash(chunk, s + 1) * 6);
    const start = m0 + 5 + hash(chunk, s + 2) * 25;
    const arc = hash(chunk, s + 3) < 0.4;
    const dm = start + n * 1.3;
    const tier = dm > 3000 ? 4 : dm > 1600 ? 3 : dm > 700 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const m = start + k * 1.3, x = m * PX;
      let y = T.groundY(x) - 34;
      if (arc) y -= Math.sin(k / (n - 1) * Math.PI) * 70;
      out.push({ t: 'coin', x, y, tier, v: [0, 3, 6, 15, 35][tier] * w.coinMult });
    }
  }
  // Treibstoff
  while (run.nextCan < (chunk + 1) * 50) {
    const m = run.nextCan;
    if (m >= m0) { const x = m * PX; out.push({ t: 'fuel', x, y: T.groundY(x) - 40 }); }
    run.canIdx++;
    run.nextCan += (110 + run.canIdx * 14) * (1 - 0.04 * gLvl('cans'));
  }
  // Edelsteine
  if (hash(chunk, s + 7) < 0.045 * (1 + 0.2 * tLvl('luck')) * (1 + Math.min(1, m0 / 3000))) {
    const x = (m0 + 10 + hash(chunk, s + 8) * 30) * PX;
    out.push({ t: 'gem', x, y: T.groundY(x) - 90 });
  }
  // Nitro-Flasche
  if (chunk % 6 === 3 && hash(chunk, s + 9) < 0.55) {
    const x = (m0 + 20) * PX; out.push({ t: 'nitro', x, y: T.groundY(x) - 45 });
  }
  // x2-Stern
  if (chunk % 5 === 2 && hash(chunk, s + 10) < 0.35) {
    const x = (m0 + 35) * PX; out.push({ t: 'star', x, y: T.groundY(x) - 55 });
  }
  // Boost-Pads
  if (w.terrain.pads > 0 && hash(chunk, s + 12) < w.terrain.pads) {
    const x = (m0 + 15 + hash(chunk, s + 13) * 20) * PX;
    out.push({ t: 'pad', x, y: T.groundY(x), len: 4 * PX });
  }
  out.sort((a, b) => a.x - b.x);
}

// ---------------- Fahrzeug ----------------
class Car {
  constructor(vid, st, x, y, g, angle) {
    const v = VEH[vid]; this.v = v; this.st = st;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.a = angle || 0; this.w = 0;
    this.m = v.mass;
    this.I = this.m * (110 * 110 + 40 * 40) / 12;
    const omega = Math.sqrt(st.ks / (this.m / 2));
    this.cs = 2 * (this.m / 2) * omega * st.damp;
    this.wheels = v.wheels.map((p, i) => ({
      ax: p[0], ay: p[1], r: v.wheelR, m: 1,
      x: x + p[0], y: y + p[1], vx: 0, vy: 0, spin: 0, contact: null,
      drive: st.awd || i === 0, slip: 0, load: 0,
    }));
    this.hull = v.hull; this.head = v.head;
  }
  place(x, y, a) {
    this.x = x; this.y = y; this.a = a; this.vx = this.vy = this.w = 0;
    const c = Math.cos(a), s = Math.sin(a);
    for (const wh of this.wheels) { wh.x = x + wh.ax * c - wh.ay * s; wh.y = y + wh.ax * s + wh.ay * c; wh.vx = wh.vy = 0; }
  }
  local(lx, ly) {
    const c = Math.cos(this.a), s = Math.sin(this.a);
    return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c, rx: lx * c - ly * s, ry: lx * s + ly * c };
  }
  speed() { return Math.hypot(this.vx, this.vy); }
}

// ---------------- Spiellauf ----------------
class Run {
  constructor(opt) {
    this.world = opt.world; this.mod = opt.mod || null; this.daily = !!opt.daily; this.demo = !!opt.demo;
    this.vid = opt.vid;
    this.seed = opt.seed != null ? opt.seed : (WORLDS.indexOf(this.world) * 7919 + 17);
    this.terrain = new Terrain(this.world, this.seed);
    this.st = carStats(this.vid, this.mod || {});
    const md = this.mod || {};
    this.g = BASE_G * this.world.g * (md.g || 1);
    this.gripW = this.world.grip;
    this.bounce = md.bounce != null ? md.bounce : this.world.bounce;
    const sx = 4 * PX;
    this.car = new Car(this.vid, this.st, sx, this.terrain.groundY(sx) - 45, this.g);
    this.startX = sx;
    this.pickups = []; this.pIdx = 0; this.chunks = 0; this.nextCan = 120; this.canIdx = 0;
    this.particles = []; this.popups = [];
    this.fuel = this.st.fuel; this.fuelMax = this.st.fuel;
    this.nitro = this.st.nitroN; this.nitroT = 0; this.nitroUsed = 0;
    this.helmets = gLvl('helmet');
    this.cm = coinMultiplier(this.mod);
    this.coins = 0; this.stuntCoins = 0; this.distCoins = 0; this.bonusCoins = 0;
    this.gems = 0; this.cans = 0;
    this.dist = 0; this.maxDist = 0; this.time = 0;
    this.airT = 0; this.airTotal = 0; this.bigAir = 0; this.rotAcc = 0; this.flips = 0; this.maxKmh = 0;
    this.x2T = 0; this.padT = 0;
    this.over = false; this.reason = ''; this.endT = 0; this.stillT = 0; this.flipT = 0;
    this.prevBest = save.best[this.world.id] || 0;
    this.milestone = save.milestones[this.world.id] || 0;
    this.launch = gLvl('launch') * 3 * PX;
    if (this.launch > 0) { this.car.vx = this.launch; for (const w of this.car.wheels) w.vx = this.launch; }
    this.shake = 0; this.events = [];
    this.genAhead();
  }
  genAhead() {
    const need = Math.floor(this.car.x / PX / 50) + 4;
    while (this.chunks < need) genPickups(this, this.chunks++);
  }
  popup(text, color, big) { this.popups.push({ text, color: color || '#fff', t: 0, big: !!big }); }
  event(e) { this.events.push(e); }

  update(dt, input) {
    if (this.over) { this.endT += dt; this.physics(dt, { gas: 0, brake: 0, nitro: 0 }); return; }
    this.time += dt;
    const gasOK = this.fuel > 0;
    const inp = { gas: input.gas && gasOK ? 1 : 0, brake: input.brake ? 1 : 0 };
    if (input.nitro && this.nitro > 0 && this.nitroT <= 0) {
      this.nitro--; this.nitroT = 1.7; this.nitroUsed++; this.event('nitro');
    }
    // Treibstoff
    const drain = this.world.fuelDrain * (0.9 + inp.gas * 3.2 + (this.nitroT > 0 ? 1 : 0));
    this.fuel = Math.max(0, this.fuel - drain * dt);
    if (this.fuel <= 0 && !this.fuelWarned) { this.fuelWarned = true; this.popup('Kein Sprit!', '#ff5252', true); }

    this.physics(dt, inp);

    const c = this.car;
    this.dist = (c.x - this.startX) / PX;
    if (this.dist > this.maxDist) {
      this.maxDist = this.dist;
      // Meilensteine (alle 250 m)
      const ms = Math.floor(this.maxDist / 250);
      if (ms > this.milestone && !this.demo && !this.daily) {
        this.milestone = ms; save.milestones[this.world.id] = ms;
        const bonus = Math.round(40 * Math.pow(ms, 1.35) * this.world.coinMult * this.cm);
        this.bonusCoins += bonus;
        let txt = `Meilenstein ${ms * 250} m! +${fmt(bonus)}`;
        if (ms % 4 === 0) { this.gems += 2; txt += ' +2💎'; }
        this.popup(txt, '#ffd54f', true); this.event('milestone');
      }
      if (this.prevBest > 50 && !this.daily && this.maxDist > this.prevBest && !this.recordShown) {
        this.recordShown = true; this.popup('NEUER REKORD!', '#69f0ae', true); this.event('record');
      }
    }
    this.distCoins = this.maxDist * 0.6 * this.world.coinMult * this.cm;
    const kmh = c.speed() / PX * 3.6; if (kmh > this.maxKmh) this.maxKmh = kmh;
    if (this.x2T > 0) this.x2T -= dt;
    this.genAhead();
    this.collect(dt);

    // Ende: kein Sprit & Stillstand
    if (this.fuel <= 0 && c.speed() < 25) { this.stillT += dt; if (this.stillT > 1.6) this.end('Kein Sprit mehr'); }
    else this.stillT = 0;
    // Ende: auf dem Dach liegend
    const upside = Math.cos(c.a) < -0.3 && this.bodyContact;
    if (upside) { this.flipT += dt; if (this.flipT > 1.8) this.end('Auf dem Dach gelandet'); } else this.flipT = 0;
  }

  end(reason) {
    if (this.over) return;
    this.over = true; this.reason = reason; this.endT = 0;
    this.event(reason.startsWith('Kein') ? 'nofuel' : 'crash');
  }
  totalCoins() { return Math.floor(this.coins + this.stuntCoins + this.distCoins + this.bonusCoins); }

  collect(dt) {
    const c = this.car, P = this.pickups;
    const mag = magnetRadius(gLvl('magnet'));
    while (this.pIdx < P.length && (P[this.pIdx].taken || P[this.pIdx].x < c.x - 400)) this.pIdx++;
    for (let i = this.pIdx; i < P.length; i++) {
      const p = P[i]; if (p.x > c.x + 400) break; if (p.taken) continue;
      if (p.t === 'pad') {
        const onPad = c.wheels.some(w => w.contact && w.x > p.x && w.x < p.x + p.len);
        if (onPad) { this.padT = 0.35; if (!p.used) { p.used = true; this.event('pad'); } }
        continue;
      }
      const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
      if (p.t === 'coin' && mag > 0 && d < mag + 60) { p.x += dx / d * 900 * dt; p.y += dy / d * 900 * dt; }
      if (d < 62) {
        p.taken = true;
        switch (p.t) {
          case 'coin': { const v = p.v * this.cm * (this.x2T > 0 ? 2 : 1); this.coins += v; this.event('coin'); this.spark(p.x, p.y, '#ffd54f', 5); break; }
          case 'fuel': this.fuel = this.fuelMax; this.cans++; this.fuelWarned = false; this.popup('Vollgetankt!', '#81c784'); this.event('fuel'); this.stillT = 0; break;
          case 'gem': this.gems++; this.popup('+1 💎', '#80deea', true); this.event('gem'); this.spark(p.x, p.y, '#80deea', 14); break;
          case 'nitro': this.nitro++; this.popup('+1 Nitro', '#ff8a65'); this.event('fuel'); break;
          case 'star': this.x2T = 12; this.popup('Doppelte Münzen! 12s', '#fff176', true); this.event('gem'); break;
        }
      }
    }
  }

  spark(x, y, col, n) {
    if (save.settings.quality < 1) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 200;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.5 + Math.random() * 0.4, t: 0, col, size: 3 + Math.random() * 3, g: 1 });
    }
  }

  physics(dt, inp) {
    const N = Math.max(1, Math.ceil(dt / (1 / 500)));
    const h = dt / N;
    for (let k = 0; k < N; k++) this.substep(h, inp);
    this.postStep(dt, inp);
  }

  substep(h, inp) {
    const c = this.car, st = this.st, g = this.g, T = this.terrain;
    const cos = Math.cos(c.a), sin = Math.sin(c.a);
    const ux = -sin, uy = cos, px = cos, py = sin;
    const ks = st.ks, cs = c.cs, kp = 50000, cp = 300, travel = st.travel, kb = ks * 12;
    let fx = 0, fy = c.m * g, tq = 0;
    for (const w of c.wheels) {
      const rx = w.ax * cos - w.ay * sin, ry = w.ax * sin + w.ay * cos;
      const Ax = c.x + rx, Ay = c.y + ry;
      const vAx = c.vx - c.w * ry, vAy = c.vy + c.w * rx;
      const dx = w.x - Ax, dy = w.y - Ay;
      const du = dx * ux + dy * uy, dp = dx * px + dy * py;
      const dvx = w.vx - vAx, dvy = w.vy - vAy;
      const dvu = dvx * ux + dvy * uy, dvp = dvx * px + dvy * py;
      let Fu = -ks * du - cs * dvu;
      if (du < -travel) Fu += -kb * (du + travel) - cs * 2 * dvu;
      else if (du > travel * 0.6) Fu += -kb * (du - travel * 0.6);
      const Fp = -kp * dp - cp * dvp;
      const Fx = Fu * ux + Fp * px, Fy = Fu * uy + Fp * py;
      w.load = Math.max(0, Fu);
      w.vx += Fx / w.m * h; w.vy += (Fy / w.m + g) * h;
      fx -= Fx; fy -= Fy; tq += rx * (-Fy) - ry * (-Fx);
    }
    // Nitro / Boost-Pad: Schub entlang der Fahrzeugachse
    if (this.nitroT > 0) { const a = st.nitroAcc; fx += px * a * c.m; fy += py * a * c.m; }
    if (this.padT > 0) { const a = 1600; fx += px * a * c.m; fy += py * a * c.m; }
    c.vx += fx / c.m * h; c.vy += fy / c.m * h; c.w += tq / c.I * h;
    // Luftkontrolle & Fahrwerksreaktion
    const air = this.airborne;
    const ctl = (inp.brake - inp.gas);
    if (air) c.w += ctl * st.air * h;
    else c.w += -inp.gas * st.air * 0.25 * h;
    c.w *= air ? 0.9995 : 0.998;
    c.w = clamp(c.w, -9, 9);
    c.x += c.vx * h; c.y += c.vy * h; c.a += c.w * h;
    for (const w of c.wheels) { w.x += w.vx * h; w.y += w.vy * h; }

    // ---- Räder gegen Boden ----
    const nd = c.wheels.filter(w => w.drive).length;
    const top = st.top * (this.nitroT > 0 ? 1.5 : 1) * (this.padT > 0 ? 1.4 : 1);
    const staticLoad = c.m * g / c.wheels.length;
    for (const w of c.wheels) {
      const ct = T.circleContact(w.x, w.y, w.r);
      w.contact = ct;
      if (!ct) continue;
      const nx = ct.nx, ny = ct.ny;
      w.x += nx * ct.pen; w.y += ny * ct.pen;
      const vn = w.vx * nx + w.vy * ny;
      if (vn < 0) { const b = vn < -150 ? this.bounce : 0; w.vx -= (1 + b) * vn * nx; w.vy -= (1 + b) * vn * ny; }
      const tx = -ny, ty = nx;
      const vt = w.vx * tx + w.vy * ty;
      const loadF = clamp(w.load / Math.max(1, staticLoad), 0.25, 1.6);
      const lim = st.grip * this.gripW * st.M / c.wheels.length * loadF;
      let F = 0, want = 0;
      if (inp.gas && w.drive) {
        want = st.accel * st.M / nd * (vt < 0 ? 1.2 : Math.max(0, 1 - vt / top));
      } else if (inp.brake) {
        if (vt > 40) want = -st.accel * 1.6 * st.M / c.wheels.length;
        else if (w.drive) want = -st.accel * 0.7 * st.M / nd * Math.max(0, 1 + vt / (st.top * 0.4));
      } else {
        want = -vt * 0.25 * st.M / c.wheels.length; // Rollwiderstand
      }
      F = clamp(want, -lim, lim);
      w.slip = Math.abs(want) > lim ? Math.min(1, (Math.abs(want) - lim) / lim + 0.3) : 0;
      w.vx += tx * F / w.m * h * 0.25; w.vy += ty * F / w.m * h * 0.25;
      // Antriebskraft wirkt über das Rad auf das ganze Fahrzeug
      c.vx += tx * F / c.m * h * 0.75; c.vy += ty * F / c.m * h * 0.75;
    }

    // ---- Karosserie gegen Boden ----
    this.bodyContactSub = false;
    for (const hp of c.hull) {
      const rx = hp[0] * cos - hp[1] * sin, ry = hp[0] * sin + hp[1] * cos;
      const Px = c.x + rx, Py = c.y + ry;
      const gy = T.groundY(Px);
      if (Py <= gy) continue;
      const n = T.normal(Px);
      const pen = (Py - gy) * -n.y;
      c.x += n.x * pen * 0.8; c.y += n.y * pen * 0.8;
      const vpx = c.vx - c.w * ry, vpy = c.vy + c.w * rx;
      const vn = vpx * n.x + vpy * n.y;
      this.bodyContactSub = true;
      if (vn >= 0) continue;
      const rn = rx * n.y - ry * n.x;
      const j = -(1 + 0.15) * vn / (1 / c.m + rn * rn / c.I);
      c.vx += j * n.x / c.m; c.vy += j * n.y / c.m; c.w += rn * j / c.I;
      const tx = -n.y, ty = n.x;
      const vt = (c.vx - c.w * ry) * tx + (c.vy + c.w * rx) * ty;
      const rt = rx * ty - ry * tx;
      let jt = -vt / (1 / c.m + rt * rt / c.I);
      jt = clamp(jt, -0.5 * j, 0.5 * j);
      c.vx += jt * tx / c.m; c.vy += jt * ty / c.m; c.w += rt * jt / c.I;
    }

    // ---- Kopf ----
    if (!this.over) {
      const hx = c.x + c.head[0] * cos - c.head[1] * sin, hy = c.y + c.head[0] * sin + c.head[1] * cos;
      if (hy > T.groundY(hx) - 9) {
        if (this.helmets > 0) {
          this.helmets--; this.popup('Helm hat dich gerettet!', '#4fc3f7', true); this.event('helmet');
          const gx = c.x; c.place(gx, T.groundY(gx) - 70, 0); c.vx = 150;
        } else this.end('Unfall!');
      }
    }
  }

  postStep(dt, inp) {
    const c = this.car;
    if (this.nitroT > 0) this.nitroT -= dt;
    if (this.padT > 0) this.padT -= dt;
    this.bodyContact = this.bodyContactSub;
    const wc = c.wheels.some(w => w.contact);
    const nowAir = !wc && !this.bodyContact;
    if (nowAir) {
      this.airT += dt; this.rotAcc += c.w * dt;
      if (this.airT > 0.12) this.airborne = true;
    } else {
      if (this.airborne && !this.over) this.landed();
      this.airborne = false; this.airT = 0; this.rotAcc = 0;
    }
    // Radrotation (optisch)
    for (const w of c.wheels) {
      if (w.contact) {
        const tx = -w.contact.ny, ty = w.contact.nx;
        w.spin += (w.vx * tx + w.vy * ty) / w.r * dt * (1 + w.slip * 2);
      } else if (inp.gas && w.drive) w.spin += 25 * dt;
      // Staub
      if (w.contact && (w.slip > 0.3 || (inp.gas && c.speed() > 200)) && Math.random() < 0.5 * (save.settings.quality + 0.3)) {
        const col = this.world.col.top2;
        this.particles.push({ x: w.x - 10, y: w.y + w.r * 0.6, vx: -c.vx * 0.2 - Math.random() * 60, vy: -40 - Math.random() * 80, life: 0.6, t: 0, col, size: 4 + Math.random() * 5, g: 0.3, fade: 1 });
      }
    }
    // Nitro-Flammen & Spur
    const back = c.local(c.v.body[0][0] - 4, -2);
    if (this.nitroT > 0 || this.padT > 0) {
      for (let i = 0; i < 3; i++) this.particles.push({ x: back.x, y: back.y, vx: -Math.cos(c.a) * 300 + (Math.random() - 0.5) * 60 + c.vx * 0.5, vy: -Math.sin(c.a) * 300 + (Math.random() - 0.5) * 60 + c.vy * 0.5, life: 0.35, t: 0, col: Math.random() < 0.5 ? '#ffeb3b' : '#ff5722', size: 6 + Math.random() * 6, g: 0, fade: 1 });
    }
    trailParticles(this, back);
    // Partikel
    const P = this.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.t += dt;
      if (p.t >= p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.vy += 600 * (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    if (P.length > 400) P.splice(0, P.length - 400);
    for (let i = this.popups.length - 1; i >= 0; i--) { const p = this.popups[i]; p.t += dt; if (p.t > 2.2) this.popups.splice(i, 1); }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
  }

  landed() {
    const air = this.airT;
    this.airTotal += air;
    if (air > this.bigAir) this.bigAir = air;
    const sm = (1 + 0.15 * gLvl('stunt')) * (1 + 0.25 * tLvl('stunt'));
    const n = Math.floor((Math.abs(this.rotAcc) + 0.7) / (Math.PI * 2));
    const base = 20 * this.world.coinMult * this.cm * sm;
    if (n > 0) {
      this.flips += n;
      const bonus = Math.round(base * n * n * 2);
      this.stuntCoins += bonus;
      const dir = this.rotAcc < 0 ? 'Rückwärtssalto' : 'Vorwärtssalto';
      this.popup(`${n > 1 ? n + 'x ' : ''}${dir}! +${fmt(bonus)}`, '#ffab40', true); this.event('flip');
    }
    if (air > 1.4) {
      const bonus = Math.round(base * (air - 1) * 1.5);
      this.stuntCoins += bonus;
      this.popup(`Flugzeit ${air.toFixed(1)}s +${fmt(bonus)}`, '#b388ff');
    }
    if (air > 0.8) this.shake = Math.min(12, air * 4);
  }
}

function trailParticles(run, back) {
  const tr = save.trail; if (tr === 'none' || run.car.speed() < 150) return;
  if (Math.random() > 0.5 * (save.settings.quality + 0.4)) return;
  const c = run.car;
  const base = { x: back.x, y: back.y, vx: -c.vx * 0.1 + (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.9, t: 0, g: 0, fade: 1, size: 6 };
  switch (tr) {
    case 'smoke': base.col = 'rgba(200,200,200,0.8)'; base.size = 8 + Math.random() * 6; break;
    case 'fire': base.col = Math.random() < 0.5 ? '#ff9800' : '#ffeb3b'; base.life = 0.4; break;
    case 'stars': base.col = '#fff59d'; base.star = true; base.size = 7; break;
    case 'rainbow': base.col = `hsl(${(run.time * 360) % 360},90%,60%)`; base.size = 9; base.life = 0.6; break;
    case 'coins': base.col = '#ffca28'; base.g = 0.6; base.coin = true; base.size = 5; break;
  }
  run.particles.push(base);
}
