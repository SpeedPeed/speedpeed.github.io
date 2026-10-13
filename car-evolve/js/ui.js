'use strict';
// ============================================================
//  Menüs (DOM)
// ============================================================
const UI = {
  tab: 'home', garageVid: null,
  tabs: [
    { id: 'home', i: '🏁', n: 'Fahren' },
    { id: 'garage', i: '🔧', n: 'Garage' },
    { id: 'worlds', i: '🌍', n: 'Welten' },
    { id: 'missions', i: '📜', n: 'Aufträge' },
    { id: 'evo', i: '🧬', n: 'Evolution' },
    { id: 'ach', i: '🏆', n: 'Erfolge' },
    { id: 'style', i: '🎨', n: 'Stil' },
    { id: 'settings', i: '⚙️', n: 'Mehr' },
  ],
};
const el = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg) {
  const t = el('toast'); t.textContent = msg; t.style.opacity = 1;
  clearTimeout(toast.h); toast.h = setTimeout(() => t.style.opacity = 0, 1800);
}
function refreshTop() {
  el('cCoins').textContent = '🪙 ' + fmt(save.coins);
  el('cGems').textContent = '💎 ' + fmt(save.gems);
  el('cCores').textContent = '🧬 ' + fmt(save.cores);
  el('cCores').classList.toggle('hidden', save.cores === 0 && save.rebirths === 0 && !canRebirth());
}
function renderTabs() {
  const badges = {
    missions: save.missions.filter(m => m.done).length + (dailyChallenge().done ? 0 : 0),
    ach: achPending(),
    evo: canRebirth() && save.rebirths === 0 ? 1 : 0,
  };
  el('tabs').innerHTML = UI.tabs.map(t => `<button data-tab="${t.id}" class="${UI.tab === t.id ? 'act' : ''}"><span class="i">${t.i}</span>${t.n}${badges[t.id] ? `<span class="badge">${badges[t.id]}</span>` : ''}</button>`).join('');
}
function showMenu(tab) {
  if (tab) UI.tab = tab;
  el('menu').classList.remove('hidden');
  el('controls').classList.add('hidden');
  renderMenu();
}
function renderMenu() {
  refreshTop(); renderTabs();
  const c = el('content');
  const f = { home: renderHome, garage: renderGarage, worlds: renderWorlds, missions: renderMissions, evo: renderEvo, ach: renderAch, style: renderStyle, settings: renderSettings }[UI.tab];
  c.innerHTML = f();
  if (UI.tab === 'home') drawPreview();
  if (UI.tab === 'garage') drawVehicleThumbs();
}
function rerender() { const sc = el('content').scrollTop; renderMenu(); el('content').scrollTop = sc; }

// ---------- Startseite ----------
function renderHome() {
  const v = VEH[save.vehicle], w = WLD[save.world];
  const st = evoStage(v.id), tl = totalUpLevels(v.id);
  const next = EVO_STAGES[st + 1];
  const prog = next ? (tl - EVO_STAGES[st].need) / (next.need - EVO_STAGES[st].need) : 1;
  const dc = dailyChallenge();
  const doneM = save.missions.filter(m => m.done).length;
  return `<div id="home">
    <div class="card" style="flex:1.3;min-width:260px">
      <canvas id="preview"></canvas>
      <div style="display:flex;justify-content:space-between;align-items:end">
        <div><b style="font-size:18px">${esc(v.name)}</b><div class="mut">Evo-Stufe ${st}: <b style="color:var(--acc)">${EVO_STAGES[st].name}</b></div></div>
        <div class="mut" style="text-align:right">${next ? `Nächste Evolution:<br>${tl}/${next.need} Upgrades` : 'Maximale Evolution!'}</div>
      </div>
      <div class="bar"><i style="width:${Math.round(prog * 100)}%"></i></div>
    </div>
    <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:10px">
      <div class="card" style="cursor:pointer" data-act="tab" data-v="worlds">
        <div class="mut">Aktuelle Welt</div>
        <b style="font-size:18px">${w.icon} ${esc(w.name)}</b>
        <div class="mut">Rekord: <b style="color:#fff">${Math.floor(save.best[w.id] || 0)} m</b> · Münzen x${w.coinMult}</div>
      </div>
      <button class="btn big green" data-act="play">LOS! ▶</button>
      <div class="row">
        <button class="btn purple" style="flex:1" data-act="daily" ${dc.done ? 'disabled' : ''}>📅 Tages-Challenge${dc.done ? ' ✓' : ''}</button>
        <button class="btn blue" style="flex:1" data-act="tab" data-v="missions">📜 Aufträge${doneM ? ` (${doneM}!)` : ''}</button>
      </div>
    </div>
  </div>
  ${save.stats.runs < 3 ? `<div class="card" style="margin-top:10px"><b>So geht's:</b> Halte <b style="color:#81c784">GAS</b> (rechts) und <b style="color:#ef5350">BREMSE</b> (links). In der Luft kippst du damit dein Auto. Sammle Kanister, sonst geht dir der Sprit aus! Mit den Münzen verbesserst du in der <b>Garage</b> dein Auto – es <b>entwickelt</b> sich dabei weiter.</div>` : ''}`;
}
function drawPreview() {
  const cv = el('preview'); if (!cv) return;
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const ctx = cv.getContext('2d');
  const t = performance.now() / 1000;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  const g = ctx.createRadialGradient(r.width / 2, r.height * 0.9, 10, r.width / 2, r.height * 0.9, r.width / 2);
  g.addColorStop(0, 'rgba(255,200,80,0.35)'); g.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, r.width, r.height);
  const v = VEH[save.vehicle];
  const s = Math.min(r.height / 110, r.width / 190);
  ctx.translate(r.width / 2, r.height * 0.55); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, v.wheels[0][1] + v.wheelR, 80, 7, 0, 0, Math.PI * 2); ctx.fill();
  drawCarLocal(ctx, v, evoStage(v.id), paintColor(t), t, v.wheels.map(p => ({ x: p[0], y: p[1], spin: t * 2 })));
}
function drawVehicleThumbs() {
  document.querySelectorAll('canvas[data-veh]').forEach(cv => {
    const v = VEH[cv.dataset.veh], dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = 120 * dpr; cv.height = 60 * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(60, 30); ctx.scale(0.62, 0.62);
    if (!save.owned[v.id]) ctx.filter = 'brightness(0.25)';
    drawCarLocal(ctx, v, evoStage(v.id), save.owned[v.id] ? paintColor(0) : '#555', 0, null);
  });
}

// ---------- Garage ----------
function renderGarage() {
  const vid = UI.garageVid || save.vehicle; UI.garageVid = vid;
  const v = VEH[vid], owned = !!save.owned[vid], maxL = maxUpLevel();
  let h = `<h3>Fahrzeuge</h3><div class="vsel">` + VEHICLES.map(x => `
    <div class="card vcard ${x.id === vid ? 'sel' : ''}" data-act="gsel" data-v="${x.id}">
      <canvas data-veh="${x.id}"></canvas>
      <div style="font-weight:800;font-size:13px">${esc(x.name)}</div>
      <div class="mut">${save.owned[x.id] ? (save.vehicle === x.id ? '✔ Aktiv' : 'Evo ' + evoStage(x.id)) : '🪙 ' + fmt(vehiclePrice(x))}</div>
    </div>`).join('') + `</div>`;
  h += `<div class="card" style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
    <div><b>${esc(v.name)}</b> <span class="mut">– ${esc(v.desc)}</span><div class="mut">Evo ${evoStage(vid)} (${EVO_STAGES[evoStage(vid)].name}) · ${totalUpLevels(vid)} Upgrades · max. Stufe ${maxL}</div></div>
    ${owned ? (save.vehicle === vid ? '<span class="mut">✔ Ausgewählt</span>' : `<button class="btn green" data-act="vuse" data-v="${vid}">Auswählen</button>`)
      : `<button class="btn" data-act="vbuy" data-v="${vid}" ${save.coins < vehiclePrice(v) ? 'disabled' : ''}>Kaufen 🪙 ${fmt(vehiclePrice(v))}</button>`}
  </div>`;
  if (owned) {
    h += `<h3>Upgrades</h3><div class="grid">` + UPGRADES.map(u => {
      const l = upLvl(vid, u.id), c = upgradeCost(vid, u.id), mx = l >= maxL;
      const dots = Array.from({ length: Math.min(maxL, 30) }, (_, i) => `<i class="${i < l * Math.min(maxL, 30) / maxL ? 'f' : ''}"></i>`).join('');
      return `<div class="card up"><div class="ic">${u.icon}</div><div class="tx"><b>${u.name} <span class="lv">St. ${l}</span></b><div class="mut">${u.desc(l)}</div><div class="dots">${dots}</div></div>
        <button class="btn ${mx ? 'gray' : ''}" data-act="up" data-v="${u.id}" ${mx || save.coins < c ? 'disabled' : ''}>${mx ? 'MAX' : '🪙 ' + fmt(c)}</button></div>`;
    }).join('') + `</div>`;
  }
  h += `<h3>Werkstatt (alle Fahrzeuge)</h3><div class="grid">` + GLOBAL_UPS.map(u => {
    const l = gLvl(u.id), c = globalCost(u.id), mx = l >= u.max;
    return `<div class="card up"><div class="ic">${u.icon}</div><div class="tx"><b>${u.name} <span class="lv">${l}/${u.max}</span></b><div class="mut">${u.desc(l)}</div></div>
      <button class="btn ${mx ? 'gray' : ''}" data-act="gup" data-v="${u.id}" ${mx || save.coins < c ? 'disabled' : ''}>${mx ? 'MAX' : '🪙 ' + fmt(c)}</button></div>`;
  }).join('') + `</div>`;
  return h;
}

// ---------- Welten ----------
function renderWorlds() {
  return `<h2>Welten</h2><div class="grid">` + WORLDS.map((w, i) => {
    const un = !!save.unlocked[w.id], info = worldUnlockInfo(i);
    const ms = save.milestones[w.id] || 0;
    return `<div class="card wcard ${save.world === w.id ? 'sel' : ''} ${un ? '' : 'lock'}" data-act="wsel" data-v="${w.id}" style="background:linear-gradient(135deg,${w.col.sky1},${w.col.g2})">
      <div class="wi">${un ? w.icon : '🔒'}</div>
      <b style="font-size:16px;text-shadow:0 2px 3px #000">${esc(w.name)}</b>
      <div style="font-size:12px;text-shadow:0 1px 2px #000">${esc(w.desc)}</div>
      <div style="font-size:12px;margin-top:4px;text-shadow:0 1px 2px #000">${un
        ? `🏁 Rekord <b>${Math.floor(save.best[w.id] || 0)} m</b> · 🪙 x${w.coinMult}${w.g !== 1 ? ` · ⬇ ${Math.round(w.g * 100)}% Schwerkraft` : ''}${w.grip < 0.8 ? ' · 🧊 rutschig' : ''}${w.fuelDrain > 1.3 ? ' · 🔥 Spritfresser' : ''}`
        : `Erreiche <b>${info.need} m</b> in ${esc(info.prev.name)} (${Math.floor(info.have)} m)`}</div>
      ${un ? `<div class="bar"><i style="width:${Math.min(100, ms * 250 / 50)}%"></i></div><div class="mut" style="color:#ddd">Meilensteine: ${ms} (${ms * 250} m)</div>` : ''}
    </div>`;
  }).join('') + `</div>`;
}

// ---------- Aufträge ----------
function renderMissions() {
  ensureMissions();
  const dc = dailyChallenge();
  let h = `<h2>Aufträge <span class="mut">(Stufe ${save.missionTier + 1})</span></h2><div class="grid">`;
  h += save.missions.map((m, i) => {
    const p = Math.min(1, m.progress / m.target);
    return `<div class="card"><b>${esc(missionText(m))}</b>
      <div class="bar"><i style="width:${Math.round(p * 100)}%;${m.done ? 'background:#66bb6a' : ''}"></i></div>
      <div class="mut">${m.type === 'speed' || m.type === 'bigair' ? (Math.round(m.progress * 10) / 10) : fmt(m.progress)} / ${m.target}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
        <span>🪙 ${fmt(m.coins)} · 💎 ${m.gems}</span>
        ${m.done ? `<button class="btn green" data-act="mclaim" data-v="${i}">Abholen!</button>` : `<button class="btn gray" data-act="mskip" data-v="${i}" style="font-size:12px">Tauschen 💎2</button>`}
      </div></div>`;
  }).join('');
  h += `</div><h3>Tages-Challenge</h3><div class="card">
    <b>${dc.world.icon} ${esc(dc.world.name)} – ★ ${esc(dc.mod.name)}</b><div class="mut">${esc(dc.mod.desc)}. Ziel: <b style="color:#fff">${dc.target} m</b>. Belohnung: 💎 8 + 🪙 ${fmt(missionRewardBase() * 3)}</div>
    <div style="margin-top:8px"><button class="btn purple" data-act="daily" ${dc.done ? 'disabled' : ''}>${dc.done ? 'Heute geschafft ✓' : 'Starten ▶'}</button></div>
  </div>
  <h3>Login-Serie</h3><div class="card"><div class="row" style="gap:6px">${[1, 2, 3, 4, 5, 6, 7].map(d => {
    const cur = ((save.daily.streak - 1) % 7) + 1;
    return `<div class="card" style="flex:1;min-width:40px;text-align:center;padding:6px;background:${d <= cur ? '#2e7d32' : 'var(--panel2)'}"><div class="mut" style="color:#fff">Tag ${d}</div>${d === 7 ? '💎15' : d >= 4 ? '💎3' : '💎1'}</div>`;
  }).join('')}</div><div class="mut" style="margin-top:6px">Aktuelle Serie: ${save.daily.streak} Tag(e). Komm jeden Tag wieder!</div></div>`;
  return h;
}

// ---------- Evolution / Neugeburt ----------
function renderEvo() {
  const cores = rebirthCores();
  let h = `<h2>Evolutions-Labor</h2>
  <div class="card"><b>♻️ Neugeburt</b>
    <div class="mut">Setzt Münzen, Fahrzeug- und Werkstatt-Upgrades zurück. Du behältst Fahrzeuge, Welten, Rekorde, Stil, Edelsteine und Talente. Jede Neugeburt gibt dauerhaft <b>+10% Münzen</b> und erhöht die maximale Upgrade-Stufe um 5 (bis 6×).</div>
    <div style="margin:8px 0">In diesem Zyklus verdient: <b>🪙 ${fmt(save.cycleCoins)}</b> → <b style="color:var(--core)">🧬 ${cores} Evo-Kerne</b>
    ${cores < 1 ? `<div class="mut">Erster Kern ab 🪙 ${fmt(20000)} Zyklus-Münzen.</div>` : `<div class="mut">Nächster Kern bei 🪙 ${fmt(Math.pow(cores + 1, 2) * 20000)}</div>`}</div>
    <button class="btn purple" data-act="rebirth" ${cores < 1 ? 'disabled' : ''}>Neugeburt (+${cores} 🧬)</button>
    <span class="mut"> Neugeburten: ${save.rebirths} · Bonus: +${save.rebirths * 10}% Münzen</span>
  </div><h3>Talente <span style="color:var(--core)">🧬 ${save.cores}</span></h3><div class="grid">`;
  h += TALENTS.map(t => {
    const l = tLvl(t.id), mx = l >= t.max, c = t.cost(l);
    return `<div class="card up"><div class="ic">${t.icon}</div><div class="tx"><b>${t.name} <span class="lv">${l}/${t.max}</span></b><div class="mut">${t.desc(Math.max(1, l))}${l === 0 ? ' (Stufe 1)' : ''}</div></div>
      <button class="btn purple ${mx ? 'gray' : ''}" data-act="talent" data-v="${t.id}" ${mx || save.cores < c ? 'disabled' : ''}>${mx ? 'MAX' : '🧬 ' + c}</button></div>`;
  }).join('') + `</div>`;
  return h;
}

// ---------- Erfolge ----------
function renderAch() {
  return `<h2>Erfolge</h2><div class="grid">` + ACHIEVEMENTS.map(a => {
    const t = save.ach[a.id] || 0, val = achStatValue(a), mx = t >= a.steps.length;
    const goal = mx ? a.steps[a.steps.length - 1] : a.steps[t];
    const cl = achClaimable(a);
    return `<div class="card ach"><div class="ic">${a.icon}</div><div style="flex:1;min-width:0"><b>${a.name}</b> <span class="stars">${'★'.repeat(t)}${'☆'.repeat(a.steps.length - t)}</span>
      <div class="mut">${fmt(Math.min(val, goal))} / ${fmt(goal)} ${a.unit}</div>
      <div class="bar"><i style="width:${Math.min(100, val / goal * 100)}%"></i></div></div>
      ${cl ? `<button class="btn green" data-act="ach" data-v="${a.id}">💎 ${achGems(t)}</button>` : ''}</div>`;
  }).join('') + `</div>`;
}

// ---------- Stil ----------
function renderStyle() {
  let h = `<h2>Lackiererei</h2><div class="card" style="text-align:center"><canvas id="preview" style="height:110px"></canvas><div>` + PAINTS.map(p => {
    const own = save.paints[p.id];
    const bg = p.c === 'rainbow' ? 'linear-gradient(90deg,red,orange,yellow,green,blue,violet)' : p.c;
    return `<div class="swatch ${save.paint === p.id ? 'sel' : ''}" style="background:${bg}" data-act="paint" data-v="${p.id}" title="${p.name}">${own ? '' : `<span class="pr">💎${p.price}</span>`}</div>`;
  }).join('') + `</div></div><h3>Spuren</h3><div class="grid">` + TRAILS.map(t => {
    const own = save.trails[t.id];
    return `<div class="card up"><div class="tx"><b>${t.name}</b></div><button class="btn ${save.trail === t.id ? 'green' : own ? 'blue' : ''}" data-act="trail" data-v="${t.id}">${save.trail === t.id ? '✔' : own ? 'Nutzen' : '💎 ' + t.price}</button></div>`;
  }).join('') + `</div>`;
  setTimeout(drawPreview, 0);
  return h;
}

// ---------- Einstellungen & Statistik ----------
function renderSettings() {
  const s = save.stats, st = save.settings;
  const tg = (k, n) => `<div class="toggle"><span>${n}</span><button class="btn ${st[k] ? 'green' : 'gray'}" data-act="set" data-v="${k}">${st[k] ? 'AN' : 'AUS'}</button></div>`;
  return `<h2>Einstellungen</h2><div class="card">
    ${tg('sound', '🔊 Sound')}${tg('vib', '📳 Vibration')}
    <div class="toggle"><span>✨ Grafikqualität</span><button class="btn blue" data-act="quality">${['Niedrig', 'Mittel', 'Hoch'][st.quality]}</button></div>
  </div>
  <h3>Statistik</h3><div class="card">
    ${[['Läufe', s.runs], ['Gesamtstrecke', fmt(s.totalDist) + ' m'], ['Verdiente Münzen', fmt(s.coinsEarned)], ['Überschläge', s.flips], ['Flugzeit', Math.round(s.airTotal) + ' s'], ['Höchstgeschwindigkeit', Math.round(s.maxSpeed) + ' km/h'], ['Kanister', s.cans], ['Unfälle', s.crashes], ['Missionen', s.missions], ['Neugeburten', save.rebirths], ['Spielzeit', Math.floor(s.playTime / 3600) + ' h ' + Math.floor(s.playTime % 3600 / 60) + ' min']].map(r => `<div class="kv"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
  </div>
  <h3>Spielstand</h3><div class="card row">
    <button class="btn blue" data-act="export">Exportieren</button>
    <button class="btn blue" data-act="import">Importieren</button>
    <button class="btn gray" data-act="reset">Zurücksetzen</button>
  </div>
  <p class="mut" style="text-align:center">Car Evolve+ v1.0 · Offline-Spiel · Fortschritt wird automatisch gespeichert.</p>`;
}

// ---------- Modals ----------
function modal(html) { el('modalBox').innerHTML = html; el('modal').classList.remove('hidden'); }
function closeModal() { el('modal').classList.add('hidden'); }
function isModalOpen() { return !el('modal').classList.contains('hidden'); }
function confirmBox(text, yes, onYes) {
  modal(`<h1>Sicher?</h1><p>${text}</p><div class="btnrow"><button class="btn gray" data-act="close">Abbrechen</button><button class="btn" data-act="confirmYes">${yes}</button></div>`);
  UI.onYes = onYes;
}

function showEvolution(vid, stage) {
  Sfx.play('evo'); vibrate([60, 40, 120]);
  modal(`<h1 style="color:#ffd54f">🧬 EVOLUTION!</h1><canvas id="evoCv" style="width:100%;height:150px"></canvas>
    <p>Dein <b>${esc(VEH[vid].name)}</b> hat sich weiterentwickelt zu:<br><b style="font-size:22px;color:var(--acc)">${EVO_STAGES[stage].name}</b></p>
    <p class="mut">+6% auf alle Werte und neues Aussehen!</p>
    <div class="btnrow"><button class="btn green" data-act="close">Super!</button></div>`);
  const cv = el('evoCv'), r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const ctx = cv.getContext('2d'); const t0 = performance.now();
  (function anim() {
    if (!el('evoCv')) return;
    const t = (performance.now() - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
    ctx.save(); ctx.translate(r.width / 2, r.height / 2 + 10);
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6 + t * 0.02); ctx.fillStyle = `rgba(255,215,0,${0.12})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, -30); ctx.lineTo(300, 30); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.translate(r.width / 2, r.height / 2 + 10); const s = Math.min(1.3, 0.3 + t * 2) * r.height / 120; ctx.scale(s, s);
    const v = VEH[vid]; drawCarLocal(ctx, v, stage, paintColor(t), t, v.wheels.map(p => ({ x: p[0], y: p[1], spin: t * 3 })));
    ctx.restore();
    if (t < 30) requestAnimationFrame(anim);
  })();
}

// ---------- Aktionen ----------
function handleAction(act, v, target) {
  Sfx.init();
  switch (act) {
    case 'tab': UI.tab = v; Sfx.play('click'); renderMenu(); el('content').scrollTop = 0; break;
    case 'play': startRun({}); break;
    case 'daily': { const dc = dailyChallenge(); if (!dc.done) startRun({ daily: true, world: dc.world, mod: dc.mod, seed: dc.seed % 100000 }); break; }
    case 'gsel': UI.garageVid = v; Sfx.play('click'); rerender(); break;
    case 'vbuy': {
      const veh = VEH[v], p = vehiclePrice(veh);
      if (save.coins >= p) { save.coins -= p; save.owned[v] = true; save.vehicle = v; Sfx.play('evo'); toast(`${veh.name} gekauft!`); persist(); rerender(); }
      break;
    }
    case 'vuse': save.vehicle = v; Sfx.play('click'); persist(); rerender(); break;
    case 'up': {
      const vid = UI.garageVid, c = upgradeCost(vid, v);
      if (save.coins < c || upLvl(vid, v) >= maxUpLevel()) { Sfx.play('error'); break; }
      const before = evoStage(vid);
      save.coins -= c; save.ups[vid] = save.ups[vid] || {}; save.ups[vid][v] = upLvl(vid, v) + 1;
      Sfx.play('buy'); vibrate(15);
      const after = evoStage(vid);
      persist(); rerender();
      if (after > before && after > (save.evoSeen[vid] || 0)) { save.evoSeen[vid] = after; persist(); showEvolution(vid, after); }
      else if (after > before) toast(`Evo-Stufe ${after}: ${EVO_STAGES[after].name}`);
      break;
    }
    case 'gup': {
      const u = GLOBAL_UPS.find(x => x.id === v), c = globalCost(v);
      if (save.coins < c || gLvl(v) >= u.max) { Sfx.play('error'); break; }
      save.coins -= c; save.gups[v] = gLvl(v) + 1; Sfx.play('buy'); vibrate(15); persist(); rerender();
      break;
    }
    case 'wsel': {
      if (!save.unlocked[v]) { Sfx.play('error'); toast('Noch gesperrt'); break; }
      save.world = v; Sfx.play('click'); persist(); rerender(); break;
    }
    case 'mclaim': { const m = claimMission(+v); if (m) { Sfx.play('milestone'); toast(`+${fmt(m.coins)} 🪙  +${m.gems} 💎`); persist(); rerender(); } break; }
    case 'mskip': if (skipMission(+v)) { persist(); rerender(); } else { Sfx.play('error'); toast('Nicht genug 💎'); } break;
    case 'rebirth':
      confirmBox(`Neugeburt für <b>${rebirthCores()} 🧬</b>? Münzen und Upgrades werden zurückgesetzt.`, 'Neugeburt!', () => {
        const c = doRebirth(); Sfx.play('evo'); toast(`+${c} Evo-Kerne! Neuer Zyklus beginnt.`); renderMenu();
      });
      break;
    case 'talent': {
      const t = TALENTS.find(x => x.id === v), l = tLvl(v), c = t.cost(l);
      if (l >= t.max || save.cores < c) { Sfx.play('error'); break; }
      save.cores -= c; save.talents[v] = l + 1; Sfx.play('buy'); persist(); rerender(); break;
    }
    case 'ach': { const a = ACHIEVEMENTS.find(x => x.id === v); const g = claimAch(a); if (g) { Sfx.play('gem'); toast(`+${g} 💎`); persist(); rerender(); } break; }
    case 'paint': {
      const p = PAINTS.find(x => x.id === v);
      if (!save.paints[v]) { if (save.gems < p.price) { Sfx.play('error'); toast('Nicht genug 💎'); break; } save.gems -= p.price; save.paints[v] = true; Sfx.play('buy'); }
      save.paint = v; persist(); rerender(); break;
    }
    case 'trail': {
      const t = TRAILS.find(x => x.id === v);
      if (!save.trails[v]) { if (save.gems < t.price) { Sfx.play('error'); toast('Nicht genug 💎'); break; } save.gems -= t.price; save.trails[v] = true; Sfx.play('buy'); }
      save.trail = v; persist(); rerender(); break;
    }
    case 'set': save.settings[v] = !save.settings[v]; if (v === 'sound' && !save.settings.sound) Sfx.engineStop(); persist(); rerender(); break;
    case 'quality': save.settings.quality = (save.settings.quality + 1) % 3; persist(); resize(); rerender(); break;
    case 'export': {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(save))));
      modal(`<h1>Spielstand exportieren</h1><p class="mut">Kopiere diesen Code und bewahre ihn auf.</p><textarea readonly id="expTa">${code}</textarea><div class="btnrow"><button class="btn blue" data-act="copy">Kopieren</button><button class="btn gray" data-act="close">Schließen</button></div>`);
      break;
    }
    case 'copy': { const ta = el('expTa'); ta.select(); try { navigator.clipboard ? navigator.clipboard.writeText(ta.value).then(() => toast('Kopiert!'), () => { document.execCommand('copy'); toast('Kopiert!'); }) : (document.execCommand('copy'), toast('Kopiert!')); } catch (e) { toast('Bitte manuell kopieren'); } break; }
    case 'import':
      modal(`<h1>Spielstand importieren</h1><p class="mut">Füge deinen Code ein. Der aktuelle Stand wird überschrieben!</p><textarea id="impTa"></textarea><div class="btnrow"><button class="btn gray" data-act="close">Abbrechen</button><button class="btn" data-act="doImport">Importieren</button></div>`);
      break;
    case 'doImport': {
      try {
        const d = JSON.parse(decodeURIComponent(escape(atob(el('impTa').value.trim()))));
        if (!d || typeof d.coins !== 'number') throw 0;
        localStorage.setItem(SAVE_KEY, JSON.stringify(d)); save = loadSave(); closeModal(); toast('Importiert!'); renderMenu();
      } catch (e) { toast('Ungültiger Code'); }
      break;
    }
    case 'reset':
      confirmBox('Wirklich <b>alles</b> löschen? Das kann nicht rückgängig gemacht werden.', 'Alles löschen', () => {
        save = newSave(); persist(); ensureMissions(); renderMenu(); toast('Zurückgesetzt');
      });
      break;
    case 'confirmYes': closeModal(); if (UI.onYes) { const f = UI.onYes; UI.onYes = null; f(); } break;
    case 'close': closeModal(); if (Game.state === 'menu') rerender(); break;
    // Spiel-Modals
    case 'resume': closeModal(); Game.paused = false; break;
    case 'restart': closeModal(); Game.paused = false; startRun(Game.lastOpts); break;
    case 'giveup': closeModal(); Game.paused = false; Game.run.end('Aufgegeben'); break;
    case 'again': closeModal(); startRun(Game.lastOpts); break;
    case 'toMenu': closeModal(); goMenu(UI.afterRunTab || 'home'); break;
    case 'double':
      if (save.gems >= 3 && !Game.doubled) {
        save.gems -= 3; Game.doubled = true; save.coins += Game.lastEarn; save.cycleCoins += Game.lastEarn; save.stats.coinsEarned += Game.lastEarn;
        persist(); Sfx.play('milestone'); target.disabled = true; target.textContent = '✔ Verdoppelt!';
        const tEl = el('earnTotal'); if (tEl) tEl.textContent = '🪙 ' + fmt(Game.lastEarn * 2);
      } else Sfx.play('error');
      break;
  }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  handleAction(b.dataset.act, b.dataset.v, b);
});
document.addEventListener('click', e => {
  const b = e.target.closest('#tabs button'); if (!b) return;
  Sfx.init(); Sfx.play('click'); UI.tab = b.dataset.tab; renderMenu(); el('content').scrollTop = 0;
});
