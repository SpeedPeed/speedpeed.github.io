'use strict';
// ============================================================
//  Spielstand, abgeleitete Werte, Missionen, Erfolge, Tagesbonus
// ============================================================

const SAVE_KEY = 'carevolveplus_save_v1';
const VEH = Object.fromEntries(VEHICLES.map(v => [v.id, v]));
const WLD = Object.fromEntries(WORLDS.map(w => [w.id, w]));

function newSave() {
  return {
    v: 1, coins: 0, gems: 0, cores: 0, rebirths: 0, cycleCoins: 0,
    vehicle: 'classic', owned: { classic: true }, ups: {}, gups: {}, talents: {},
    world: 'meadow', unlocked: { meadow: true }, best: {}, milestones: {},
    paint: 'red', paints: { red: true, blue: true }, trail: 'none', trails: { none: true },
    missions: [], missionTier: 0, ach: {}, evoSeen: {},
    stats: { totalDist: 0, runs: 0, flips: 0, coinsEarned: 0, airTotal: 0, maxSpeed: 0, cans: 0, crashes: 0,
      missions: 0, rebirths: 0, gemsFound: 0, dailies: 0, maxFlipsRun: 0, bestRunCoins: 0, avgEarn: 0, playTime: 0 },
    daily: { last: '', streak: 0, chDay: '', chDone: false },
    settings: { sound: true, vib: true, quality: 1, controls: 0 },
    tutorial: true,
  };
}

let save = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const base = newSave();
      // fehlende Felder ergänzen (Vorwärtskompatibilität)
      for (const k in base) if (d[k] === undefined) d[k] = base[k];
      for (const k in base.stats) if (d.stats[k] === undefined) d.stats[k] = base.stats[k];
      for (const k in base.settings) if (d.settings[k] === undefined) d.settings[k] = base.settings[k];
      return d;
    }
  } catch (e) { console.warn('Spielstand konnte nicht geladen werden', e); }
  return newSave();
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* Speicher voll / blockiert */ }
}

// ---------- Getter ----------
const upLvl = (vid, uid) => (save.ups[vid] && save.ups[vid][uid]) || 0;
const gLvl = id => save.gups[id] || 0;
const tLvl = id => save.talents[id] || 0;
const maxUpLevel = () => 30 + tLvl('cap') * 5 + Math.min(save.rebirths, 6) * 5;

function totalUpLevels(vid) {
  let s = 0; for (const u of UPGRADES) s += upLvl(vid, u.id); return s;
}
function evoStage(vid) {
  const t = totalUpLevels(vid); let s = 0;
  for (let i = 0; i < EVO_STAGES.length; i++) if (t >= EVO_STAGES[i].need) s = i;
  return s;
}
function coinMultiplier(mod) {
  return (1 + 0.1 * gLvl('value')) * (1 + 0.15 * tLvl('gold')) * (1 + 0.1 * save.rebirths) * ((mod && mod.coins) || 1);
}
function costDiscount() { return 1 - 0.04 * tLvl('cheap'); }
function upgradeCost(vid, uid) {
  const u = UPGRADES.find(x => x.id === uid); const l = upLvl(vid, uid);
  return Math.round(u.base * VEH[vid].costMult * Math.pow(1.3, l) * (1 + l * 0.05) * costDiscount());
}
function globalCost(id) {
  const u = GLOBAL_UPS.find(x => x.id === id); const l = gLvl(id);
  return Math.round(u.base * Math.pow(u.mult || 1.45, l) * costDiscount());
}
function vehiclePrice(v) { return Math.round(v.price * costDiscount()); }

// Fahrzeugwerte für einen Lauf
function carStats(vid, mod) {
  mod = mod || {};
  const v = VEH[vid]; const L = id => upLvl(vid, id);
  const em = 1 + evoStage(vid) * 0.06;
  const M = v.mass + 2;
  return {
    mass: v.mass, M,
    accel: 560 * v.mult.engine * (1 + 0.09 * L('engine')) * em * (1 + 0.05 * tLvl('turbo')) * (mod.engine || 1),
    top: 560 * v.mult.speed * (1 + 0.06 * L('engine')) * em,
    fuel: 60 * v.mult.fuel * (1 + 0.12 * L('fuel')) * em * (1 + 0.08 * tLvl('tank')) * (mod.fuel || 1),
    grip: 950 * v.mult.grip * (1 + 0.08 * L('grip')) * em * (mod.grip || 1),
    ks: 70 * v.mass * v.susp * (1 + 0.04 * L('susp')),
    damp: 0.55 + 0.02 * Math.min(L('susp'), 20),
    travel: 12 * v.susp,
    air: 3.4 * v.mult.air * (1 + 0.07 * L('air')) * em,
    nitroN: mod.nitro === 0 ? 0 : 1 + Math.floor(L('nitro') / 5) + tLvl('nitro') + (v.rocket ? 2 : 0),
    nitroAcc: 1100 * v.mult.nitro * (1 + 0.06 * L('nitro')),
    awd: !!v.awd,
  };
}

// ---------- Freischaltungen ----------
function worldUnlockInfo(i) {
  if (i === 0) return { ok: true };
  const prev = WORLDS[i - 1]; const need = WORLDS[i].unlock;
  const have = save.best[prev.id] || 0;
  return { ok: have >= need, prev, need, have };
}
function refreshUnlocks() {
  let changed = [];
  WORLDS.forEach((w, i) => {
    if (!save.unlocked[w.id] && worldUnlockInfo(i).ok) { save.unlocked[w.id] = true; changed.push(w); }
  });
  return changed;
}

// ---------- Missionen ----------
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function round5(n) { return Math.max(5, Math.round(n / 5) * 5); }
function round25(n) { return Math.max(25, Math.round(n / 25) * 25); }

function missionRewardBase() {
  const avg = Math.max(150, save.stats.avgEarn || 0);
  return avg * (1 + 0.2 * tLvl('miss'));
}
function genMission() {
  const tier = save.missionTier;
  const unlockedW = WORLDS.filter(w => save.unlocked[w.id]);
  const types = MISSION_TYPES.filter(t => !save.missions.some(m => m && m.type === t));
  const type = pick(types.length ? types : MISSION_TYPES);
  const m = { type, progress: 0, done: false };
  const bestW = id => save.best[id] || 0;
  switch (type) {
    case 'dist': case 'world': {
      const w = type === 'world' ? pick(unlockedW) : WLD[save.world] || unlockedW[0];
      m.world = w.id; m.target = round25(Math.max(150, bestW(w.id) * rnd(0.85, 1.12)));
      break;
    }
    case 'coins': m.target = round25(Math.max(80, (save.stats.bestRunCoins || 100) * rnd(0.6, 1.0))); break;
    case 'flips': m.target = Math.min(25, 1 + Math.floor(tier / 3) + Math.floor(Math.random() * 2)); break;
    case 'air': m.target = Math.min(90, Math.round(3 + tier * 1.2 + rnd(0, 3))); break;
    case 'speed': m.target = round5(Math.max(45, (save.stats.maxSpeed || 40) * rnd(0.9, 1.08))); break;
    case 'cans': m.target = Math.min(30, 2 + Math.floor(tier / 3) + Math.floor(Math.random() * 2)); break;
    case 'total': m.target = round25(1500 * (1 + tier * 0.4)); break;
    case 'nonitro': { const b = save.best[save.world] || 0; m.world = save.world; m.target = round25(Math.max(120, b * rnd(0.55, 0.8))); break; }
    case 'bigair': m.target = Math.round(Math.min(20, 1.5 + tier * 0.25 + rnd(0, 1)) * 10) / 10; break;
  }
  m.coins = Math.round(missionRewardBase() * rnd(1.3, 2.2));
  m.gems = Math.random() < 0.35 ? 2 : 1;
  return m;
}
function missionText(m) {
  const wn = m.world ? WLD[m.world].name : '';
  switch (m.type) {
    case 'dist': case 'world': return `Erreiche ${m.target} m in ${wn}`;
    case 'coins': return `Verdiene ${fmt(m.target)} Münzen in einem Lauf`;
    case 'flips': return `Schaffe ${m.target} Überschläge in einem Lauf`;
    case 'air': return `Sammle ${m.target} s Flugzeit in einem Lauf`;
    case 'speed': return `Erreiche ${m.target} km/h`;
    case 'cans': return `Sammle ${m.target} Kanister in einem Lauf`;
    case 'total': return `Fahre insgesamt ${fmt(m.target)} m`;
    case 'nonitro': return `${m.target} m in ${wn} ohne Nitro`;
    case 'bigair': return `Ein einzelner Sprung mit ${m.target} s Flugzeit`;
  }
  return '?';
}
function ensureMissions() {
  while (save.missions.length < 3) save.missions.push(genMission());
}
// Nach einem Lauf: Fortschritt eintragen. r = Laufergebnis
function updateMissions(r) {
  const done = [];
  for (const m of save.missions) {
    if (m.done) continue;
    let val = 0;
    switch (m.type) {
      case 'dist': case 'world': val = r.world === m.world ? r.dist : 0; break;
      case 'coins': val = r.earned; break;
      case 'flips': val = r.flips; break;
      case 'air': val = r.air; break;
      case 'speed': val = r.maxKmh; break;
      case 'cans': val = r.cans; break;
      case 'total': m.progress += r.dist; val = m.progress; break;
      case 'nonitro': val = (r.world === m.world && r.nitroUsed === 0) ? r.dist : 0; break;
      case 'bigair': val = r.bigAir; break;
    }
    if (m.type !== 'total') m.progress = Math.max(m.progress, val);
    if (m.progress >= m.target) { m.done = true; done.push(m); }
  }
  return done;
}
function claimMission(i) {
  const m = save.missions[i]; if (!m || !m.done) return null;
  save.coins += m.coins; save.cycleCoins += m.coins; save.gems += m.gems;
  save.stats.missions++; save.missionTier++;
  save.missions[i] = genMission();
  return m;
}
function skipMission(i) {
  if (save.gems < 2) return false;
  save.gems -= 2; save.missions[i] = genMission(); return true;
}

// ---------- Erfolge ----------
function achStatValue(a) {
  const s = save.stats;
  switch (a.stat) {
    case 'bestAny': return Math.max(0, ...WORLDS.map(w => save.best[w.id] || 0));
    case 'worlds': return Object.keys(save.unlocked).length;
    case 'cars': return Object.keys(save.owned).length;
    case 'maxEvo': return Math.max(...VEHICLES.filter(v => save.owned[v.id]).map(v => evoStage(v.id)));
    default: return s[a.stat] || 0;
  }
}
function achClaimable(a) {
  const t = save.ach[a.id] || 0;
  return t < a.steps.length && achStatValue(a) >= a.steps[t];
}
function achGems(t) { return 3 + t * 3; }
function claimAch(a) {
  if (!achClaimable(a)) return 0;
  const t = save.ach[a.id] || 0; const g = achGems(t);
  save.ach[a.id] = t + 1; save.gems += g; return g;
}
function achPending() { return ACHIEVEMENTS.filter(achClaimable).length; }

// ---------- Tagesbonus & Tageschallenge ----------
function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function dailyLoginCheck() {
  const today = dayKey();
  if (save.daily.last === today) return null;
  const y = new Date(); y.setDate(y.getDate() - 1);
  save.daily.streak = save.daily.last === dayKey(y) ? save.daily.streak + 1 : 1;
  save.daily.last = today;
  const day = ((save.daily.streak - 1) % 7) + 1;
  const coins = Math.round(Math.max(300, (save.stats.avgEarn || 100) * 1.5) * day);
  const gems = day === 7 ? 15 : day >= 4 ? 3 : 1;
  save.coins += coins; save.cycleCoins += coins; save.gems += gems;
  return { day, coins, gems, streak: save.daily.streak };
}
function seedFromString(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function dailyChallenge() {
  const key = dayKey(); const seed = seedFromString(key);
  const unlockedW = WORLDS.filter(w => save.unlocked[w.id]);
  const w = unlockedW[seed % unlockedW.length];
  const mod = MODIFIERS[(seed >>> 8) % MODIFIERS.length];
  const target = round25(Math.max(200, (save.best[w.id] || 0) * 0.7));
  if (save.daily.chDay !== key) { save.daily.chDay = key; save.daily.chDone = false; save.daily.chTarget = target; }
  return { world: w, mod, target: save.daily.chTarget || target, done: save.daily.chDone, seed };
}

// ---------- Neugeburt ----------
function rebirthCores() { return Math.floor(Math.sqrt(save.cycleCoins / 20000)); }
function canRebirth() { return rebirthCores() >= 1; }
function doRebirth() {
  const c = rebirthCores(); if (c < 1) return 0;
  save.cores += c; save.rebirths++; save.stats.rebirths++;
  save.coins = startCapital(tLvl('start')); save.cycleCoins = 0;
  save.ups = {}; save.gups = {};
  persist(); return c;
}
