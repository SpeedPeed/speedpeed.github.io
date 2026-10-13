'use strict';
// ============================================================
//  Hauptschleife, Eingabe, Spielablauf
// ============================================================
const canvas = el('game');
const ctx = canvas.getContext('2d');
const input = { gas: false, brake: false, nitro: false, keys: {} };
const Game = { state: 'menu', run: null, demo: null, paused: false, lastOpts: {}, resultsShown: false, lastEarn: 0, doubled: false };
let W = 0, H = 0, DPR = 1;

function resize() {
  const q = save.settings.quality, d = window.devicePixelRatio || 1;
  DPR = q === 0 ? 1 : q === 1 ? Math.min(1.5, d) : Math.min(2.5, d);
  W = canvas.width = Math.round(innerWidth * DPR);
  H = canvas.height = Math.round(innerHeight * DPR);
}
addEventListener('resize', () => { resize(); if (Game.state === 'menu' && UI.tab === 'home') drawPreview(); });

// ---------- Eingabe ----------
function bindPedal(id, key) {
  const b = el(id);
  const on = e => { e.preventDefault(); Sfx.init(); input[key] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) { } };
  const off = e => { e.preventDefault(); input[key] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
  b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  b.addEventListener('contextmenu', e => e.preventDefault());
}
bindPedal('gas', 'gas'); bindPedal('brake', 'brake');
el('nitroBtn').addEventListener('pointerdown', e => { e.preventDefault(); input.nitroTap = true; });
el('pauseBtn').addEventListener('click', () => pauseGame());
// Zusätzlich: Bildschirmhälften als Pedale
const canvasPtr = {};
canvas.addEventListener('pointerdown', e => {
  if (Game.state !== 'run') return;
  Sfx.init();
  const side = e.clientX < innerWidth / 2 ? 'brake' : 'gas';
  canvasPtr[e.pointerId] = side; input[side] = true;
  el(side).classList.add('on');
});
const canvasUp = e => {
  const side = canvasPtr[e.pointerId]; if (!side) return;
  delete canvasPtr[e.pointerId];
  if (!Object.values(canvasPtr).includes(side)) { input[side] = false; el(side).classList.remove('on'); }
};
canvas.addEventListener('pointerup', canvasUp); canvas.addEventListener('pointercancel', canvasUp);
addEventListener('keydown', e => {
  input.keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'ShiftLeft') input.nitroTap = true;
  if (e.code === 'Escape' || e.code === 'KeyP') { if (Game.state === 'run') { if (Game.paused && isModalOpen()) handleAction('resume'); else pauseGame(); } }
  if (e.code === 'Enter' && Game.state === 'menu' && !isModalOpen()) startRun({});
});
addEventListener('keyup', e => { input.keys[e.code] = false; });
function readInput() {
  const k = input.keys;
  return {
    gas: input.gas || k.ArrowRight || k.KeyD || k.ArrowUp || k.KeyW,
    brake: input.brake || k.ArrowLeft || k.KeyA || k.ArrowDown || k.KeyS,
    nitro: input.nitroTap,
  };
}

// ---------- Spielablauf ----------
function startRun(opts) {
  Sfx.init();
  const daily = !!opts.daily;
  const world = opts.world || WLD[save.world];
  Game.lastOpts = opts;
  Game.run = new Run({ world, vid: save.vehicle, mod: opts.mod, daily, seed: opts.seed });
  Game.state = 'run'; Game.paused = false; Game.resultsShown = false; Game.doubled = false;
  input.gas = input.brake = false; input.nitroTap = false;
  el('gas').classList.remove('on'); el('brake').classList.remove('on');
  el('menu').classList.add('hidden'); el('controls').classList.remove('hidden');
  closeModal();
  cam.x = Game.run.car.x; cam.y = Game.run.car.y; cam.z = H / 520;
  Sfx.engineStart();
  if (save.stats.runs < 2) {
    const hEl = el('hint'); hEl.innerHTML = 'Rechts <b>GAS</b> · Links <b>BREMSE</b><br>In der Luft: Gas/Bremse kippt das Auto'; hEl.classList.remove('hidden'); hEl.style.opacity = 1;
    setTimeout(() => { hEl.style.opacity = 0; setTimeout(() => hEl.classList.add('hidden'), 1000); }, 4500);
  }
}
function pauseGame() {
  if (Game.state !== 'run' || Game.run.over) return;
  Game.paused = true; input.gas = input.brake = false;
  modal(`<h1>Pause</h1><p class="mut">${esc(Game.run.world.name)} · ${Math.floor(Game.run.dist)} m · 🪙 ${fmt(Game.run.totalCoins())}</p>
    <div class="btnrow"><button class="btn green" data-act="resume">Weiter ▶</button><button class="btn blue" data-act="restart">Neustart ↻</button><button class="btn gray" data-act="giveup">Beenden ✖</button></div>`);
}
function goMenu(tab) {
  Game.state = 'menu'; Game.run = null; Sfx.engineStop();
  showMenu(tab);
}

function finishRun() {
  const r = Game.run; Game.resultsShown = true; Sfx.engineStop();
  const earn = r.totalCoins(), s = save.stats;
  const wid = r.world.id, dist = Math.floor(r.maxDist);
  const prevBest = save.best[wid] || 0;
  const newRecord = !r.daily && dist > prevBest;
  if (!r.daily) save.best[wid] = Math.max(prevBest, dist);
  save.coins += earn; save.cycleCoins += earn; save.gems += r.gems;
  s.runs++; s.totalDist += dist; s.flips += r.flips; s.coinsEarned += earn; s.airTotal += r.airTotal;
  s.maxSpeed = Math.max(s.maxSpeed, r.maxKmh); s.cans += r.cans; s.gemsFound += r.gems;
  if (r.reason !== 'Kein Sprit mehr' && r.reason !== 'Aufgegeben') s.crashes++;
  s.maxFlipsRun = Math.max(s.maxFlipsRun, r.flips); s.bestRunCoins = Math.max(s.bestRunCoins, earn);
  s.avgEarn = s.avgEarn ? s.avgEarn * 0.8 + earn * 0.2 : earn;
  // Tages-Challenge
  let dailyMsg = '';
  if (r.daily) {
    const dc = dailyChallenge();
    if (!dc.done && dist >= dc.target) {
      const c = Math.round(missionRewardBase() * 3);
      save.daily.chDone = true; save.gems += 8; save.coins += c; save.cycleCoins += c; s.dailies++;
      dailyMsg = `<div class="card" style="background:#4a148c;margin-top:8px">📅 Tages-Challenge geschafft! +8 💎 +${fmt(c)} 🪙</div>`;
    } else if (!dc.done) dailyMsg = `<div class="card" style="margin-top:8px">📅 Ziel: ${dc.target} m – noch ${dc.target - dist} m!</div>`;
  }
  ensureMissions();
  const mDone = updateMissions({ world: wid, dist, earned: earn, flips: r.flips, air: r.airTotal, maxKmh: r.maxKmh, cans: r.cans, nitroUsed: r.nitroUsed, bigAir: r.bigAir });
  const newW = refreshUnlocks();
  persist();
  Game.lastEarn = earn;
  UI.afterRunTab = mDone.length ? 'missions' : 'garage';
  // Kann man sich etwas leisten?
  const vid = save.vehicle;
  const affordable = UPGRADES.some(u => upLvl(vid, u.id) < maxUpLevel() && save.coins >= upgradeCost(vid, u.id));
  const kv = (a, b) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`;
  const reasonCol = r.reason === 'Kein Sprit mehr' ? '#ffb74d' : r.reason === 'Aufgegeben' ? '#90a4ae' : '#ef5350';
  modal(`<h1 style="color:${reasonCol}">${esc(r.reason)}</h1>
    <div style="font-size:34px;font-weight:900">${dist} m ${newRecord ? '<span style="color:#69f0ae;font-size:18px">NEUER REKORD!</span>' : ''}</div>
    <div class="mut">${r.world.icon} ${esc(r.world.name)}${r.mod ? ' · ★ ' + esc(r.mod.name) : ''} · Rekord ${Math.floor(save.best[wid] || 0)} m</div>
    <div style="margin-top:8px;text-align:left">
      ${kv('Strecke', '🪙 ' + fmt(r.distCoins))}${kv('Gesammelt', '🪙 ' + fmt(r.coins))}
      ${r.stuntCoins ? kv(`Stunts (${r.flips} Überschläge, ${r.airTotal.toFixed(1)} s Flug)`, '🪙 ' + fmt(r.stuntCoins)) : ''}
      ${r.bonusCoins ? kv('Meilensteine', '🪙 ' + fmt(r.bonusCoins)) : ''}
      ${r.gems ? kv('Edelsteine', '💎 ' + r.gems) : ''}
      ${kv('Top-Speed', Math.round(r.maxKmh) + ' km/h')}
    </div>
    <div class="total" id="earnTotal">🪙 ${fmt(earn)}</div>
    ${mDone.map(m => `<div class="card" style="background:#1b5e20;margin-top:6px">✔ Auftrag erfüllt: ${esc(missionText(m))}</div>`).join('')}
    ${newW.map(w => `<div class="card" style="background:#0d47a1;margin-top:6px">🔓 Neue Welt freigeschaltet: ${w.icon} ${esc(w.name)}</div>`).join('')}
    ${dailyMsg}
    ${affordable ? '<div class="mut" style="margin-top:6px;color:#ffd54f">⬆ Du kannst dir neue Upgrades leisten!</div>' : ''}
    <div class="btnrow">
      ${earn > 0 ? `<button class="btn purple" data-act="double" ${save.gems < 3 ? 'disabled' : ''}>x2 für 💎3</button>` : ''}
      <button class="btn ${affordable ? '' : 'blue'}" data-act="toMenu">${mDone.length ? 'Aufträge 📜' : 'Garage 🔧'}</button>
      <button class="btn green" data-act="again">Nochmal ↻</button>
    </div>`);
  if (newW.length) Sfx.play('evo');
}

// ---------- Kamera ----------
function updateCamera(run, dt, demo) {
  const c = run.car, sp = c.speed();
  const tx = c.x + clamp(c.vx * 0.35, -150, 380) + (demo ? 0 : 80);
  const ty = c.y + 25 + clamp(c.vy * 0.12, -80, 120);
  const k = 1 - Math.exp(-dt * 5);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  const base = Math.min(H / 520, W / 820);
  const zt = base * (1 - Math.min(0.3, sp / 5000)) * (run.airborne ? 0.92 : 1);
  cam.z += (zt - cam.z) * (1 - Math.exp(-dt * 1.5));
}

// ---------- Demo im Menü-Hintergrund ----------
function newDemo() {
  const w = WLD[save.world] || WORLDS[0];
  const d = new Run({ world: w, vid: save.vehicle, demo: true });
  d.demo = true; d.fuel = d.fuelMax = 1e9;
  cam.x = d.car.x; cam.y = d.car.y; cam.z = Math.min(H / 520, W / 820);
  return d;
}

// ---------- Hauptschleife ----------
let last = performance.now(), saveTimer = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05; if (dt <= 0) return;
  const t = now / 1000;
  if (Game.state === 'run') {
    const run = Game.run;
    run_groundY = x => run.terrain.groundY(x);
    if (!Game.paused) {
      const inp = readInput(); input.nitroTap = false;
      run.update(dt, inp);
      save.stats.playTime += dt;
      for (const e of run.events) {
        Sfx.play(e);
        if (e === 'crash') vibrate(200); else if (e === 'flip' || e === 'milestone') vibrate(40); else if (e === 'gem') vibrate(20);
      }
      run.events.length = 0;
      Sfx.engineUpdate(run.car.speed(), inp.gas && run.fuel > 0 && !run.over ? 1 : 0, run.nitroT > 0);
      el('nitroBtn').classList.toggle('off', run.nitro <= 0);
      el('nitroBtn').textContent = 'NITRO ' + run.nitro;
      updateCamera(run, dt);
      if (run.over && run.endT > 1.3 && !Game.resultsShown) finishRun();
    } else Sfx.engineUpdate(0, 0, false);
    drawBackground(ctx, W, H, run.world, t);
    drawWorld(ctx, W, H, run, t);
    drawHUD(ctx, W, H, run, t, DPR);
  } else {
    // Menü: Demo-Fahrt im Hintergrund
    if (!Game.demo || Game.demo.world.id !== save.world || Game.demo.vid !== save.vehicle || Game.demo.over && Game.demo.endT > 1 || Game.demo.time > 60) Game.demo = newDemo();
    const d = Game.demo; run_groundY = x => d.terrain.groundY(x);
    const c = d.car;
    const auto = { gas: Math.cos(c.a) > 0.5 || !d.airborne, brake: d.airborne && Math.sin(c.a) < -0.35 && Math.cos(c.a) > 0, nitro: false };
    if (d.airborne) { auto.gas = c.a < -0.25 ? false : c.a > 0.25 ? true : false; auto.brake = c.a < -0.25; }
    d.update(dt, auto); d.events.length = 0; d.popups.length = 0;
    updateCamera(d, dt, true);
    drawBackground(ctx, W, H, d.world, t);
    drawWorld(ctx, W, H, d, t);
    if (UI.tab === 'home' || UI.tab === 'style') { if ((saveTimer += dt) > 0.05) { saveTimer = 0; drawPreview(); } }
  }
}

// ---------- System / Android ----------
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (Game.state === 'run' && !Game.run.over && !Game.paused) pauseGame(); Sfx.engineStop(); persist(); if (Sfx.ctx) Sfx.ctx.suspend(); }
  else { if (Sfx.ctx) Sfx.ctx.resume(); if (Game.state === 'run' && !Game.run.over) Sfx.engineStart(); }
});
addEventListener('pagehide', persist);
setInterval(persist, 15000);
// Wird vom Android-Zurück-Knopf aufgerufen. Rückgabe false = App schließen.
window.onAndroidBack = function () {
  if (Game.state === 'run') {
    if (Game.run.over) { if (Game.resultsShown) handleAction('toMenu'); return true; }
    if (Game.paused) { handleAction('resume'); return true; }
    pauseGame(); return true;
  }
  if (isModalOpen()) { closeModal(); return true; }
  if (UI.tab !== 'home') { UI.tab = 'home'; renderMenu(); return true; }
  persist(); return false;
};

// ---------- Start ----------
resize();
ensureMissions();
refreshUnlocks();
showMenu('home');
const login = dailyLoginCheck();
persist();
if (login) {
  setTimeout(() => modal(`<h1>📅 Täglicher Bonus</h1><p>Tag <b>${login.day}</b> von 7 · Serie: ${login.streak}</p><div class="total">🪙 ${fmt(login.coins)} &nbsp; 💎 ${login.gems}</div><p class="mut">Komm morgen wieder für mehr!</p><div class="btnrow"><button class="btn green" data-act="close">Danke!</button></div>`), 300);
}
requestAnimationFrame(frame);
