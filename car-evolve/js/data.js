'use strict';
// ============================================================
//  Car Evolve+  –  Spieldaten (Welten, Fahrzeuge, Upgrades ...)
// ============================================================

const PX = 30;              // Pixel pro Meter
const BASE_G = 900;         // Grundschwerkraft (px/s²)

// ---------- Welten ----------
// terrain: amp = Hügelhöhe (px), freq = Hügelfrequenz, rough = Unebenheit,
// growth = Meter bis die Hügel doppelt so hoch sind, ramps = Rampen-Chance,
// craters = Krater-Chance, pads = Boost-Pads
const WORLDS = [
  { id: 'meadow', name: 'Grüne Wiesen', icon: '🌳', desc: 'Sanfte Hügel – perfekt zum Starten.',
    g: 1, grip: 1, bounce: 0.05, fuelDrain: 1, coinMult: 1, unlock: 0,
    terrain: { amp: 70, freq: 1, rough: 0.6, growth: 900, ramps: 0.15, craters: 0, pads: 0 },
    col: { sky1: '#5bb8ff', sky2: '#d6f0ff', far: '#9cc7e8', mid: '#6fb36a', g1: '#7a4e2d', g2: '#4b2e19', top: '#4caf50', top2: '#7bd85c', deco: 'tree' } },
  { id: 'desert', name: 'Glutwüste', icon: '🌵', desc: 'Lange Dünen und große Sprünge.',
    g: 1, grip: 0.85, bounce: 0.03, fuelDrain: 1.15, coinMult: 1.7, unlock: 600,
    terrain: { amp: 120, freq: 0.7, rough: 0.25, growth: 1000, ramps: 0.25, craters: 0, pads: 0 },
    col: { sky1: '#ffb347', sky2: '#ffe8b0', far: '#e8b77a', mid: '#d99a55', g1: '#e2b866', g2: '#b5803e', top: '#f2cf7c', top2: '#fff0b8', deco: 'cactus' } },
  { id: 'arctic', name: 'Eiswüste', icon: '❄️', desc: 'Rutschiges Eis – Grip ist alles!',
    g: 1, grip: 0.5, bounce: 0.05, fuelDrain: 1.1, coinMult: 2.6, unlock: 700,
    terrain: { amp: 95, freq: 1.1, rough: 0.5, growth: 950, ramps: 0.2, craters: 0, pads: 0 },
    col: { sky1: '#8fb8de', sky2: '#eef7ff', far: '#c9dcef', mid: '#a9c6e0', g1: '#9fc3e6', g2: '#5d84b0', top: '#ffffff', top2: '#d8f0ff', deco: 'pine', snow: true } },
  { id: 'jungle', name: 'Dschungel', icon: '🌴', desc: 'Holprig, wild und voller Schätze.',
    g: 1, grip: 1.05, bounce: 0.08, fuelDrain: 1.2, coinMult: 4, unlock: 800,
    terrain: { amp: 85, freq: 1.4, rough: 1.3, growth: 850, ramps: 0.1, craters: 0, pads: 0 },
    col: { sky1: '#3f8f6b', sky2: '#c5ecc0', far: '#4f9a72', mid: '#2f7a4a', g1: '#4a3220', g2: '#2a1a10', top: '#2e9e3e', top2: '#5fd05a', deco: 'palm' } },
  { id: 'canyon', name: 'Roter Canyon', icon: '🏜️', desc: 'Riesige Rampen. Fliegen lernen!',
    g: 1, grip: 0.95, bounce: 0.05, fuelDrain: 1.2, coinMult: 6, unlock: 900,
    terrain: { amp: 140, freq: 0.8, rough: 0.5, growth: 900, ramps: 0.6, craters: 0, pads: 0 },
    col: { sky1: '#f08a4b', sky2: '#ffd9a8', far: '#c96a3f', mid: '#a8502b', g1: '#b55a32', g2: '#6e2f17', top: '#d2774a', top2: '#efa070', deco: 'rock' } },
  { id: 'moon', name: 'Mondbasis', icon: '🌙', desc: 'Geringe Schwerkraft, endlose Flüge.',
    g: 0.35, grip: 0.9, bounce: 0.05, fuelDrain: 1.1, coinMult: 9, unlock: 1000,
    terrain: { amp: 110, freq: 0.9, rough: 0.7, growth: 900, ramps: 0.2, craters: 0.6, pads: 0 },
    col: { sky1: '#05060f', sky2: '#1b2140', far: '#2a2f4a', mid: '#3a3f5a', g1: '#8d8f99', g2: '#4a4c55', top: '#c9cbd3', top2: '#eceef5', deco: 'crystal', stars: true } },
  { id: 'volcano', name: 'Vulkan', icon: '🌋', desc: 'Hitze frisst Sprit. Steile Hänge!',
    g: 1.1, grip: 1, bounce: 0.05, fuelDrain: 1.6, coinMult: 14, unlock: 1000,
    terrain: { amp: 150, freq: 1.0, rough: 0.9, growth: 800, ramps: 0.3, craters: 0, pads: 0 },
    col: { sky1: '#3a0d0d', sky2: '#c2410c', far: '#4a1a12', mid: '#2b0f0b', g1: '#2b1a17', g2: '#120806', top: '#ff5a1f', top2: '#ffb347', deco: 'lava', embers: true } },
  { id: 'neon', name: 'Neon City', icon: '🌃', desc: 'Boost-Pads, Rampen, Highspeed.',
    g: 1, grip: 1.1, bounce: 0.05, fuelDrain: 1.3, coinMult: 20, unlock: 1100,
    terrain: { amp: 100, freq: 0.9, rough: 0.3, growth: 900, ramps: 0.5, craters: 0, pads: 0.7 },
    col: { sky1: '#0b0221', sky2: '#3b0a5c', far: '#1d0b3a', mid: '#2a0f52', g1: '#1a1033', g2: '#0a0618', top: '#ff2bd6', top2: '#3df2ff', deco: 'building', stars: true } },
  { id: 'mars', name: 'Mars', icon: '🔴', desc: 'Krater und rote Stürme.',
    g: 0.6, grip: 0.85, bounce: 0.05, fuelDrain: 1.3, coinMult: 30, unlock: 1200,
    terrain: { amp: 140, freq: 0.9, rough: 0.8, growth: 850, ramps: 0.3, craters: 0.5, pads: 0 },
    col: { sky1: '#c1440e', sky2: '#f4a56a', far: '#a8481c', mid: '#8a3412', g1: '#9c3d16', g2: '#5a1f08', top: '#d9662b', top2: '#f08d55', deco: 'rock' } },
  { id: 'candy', name: 'Süßigkeitenland', icon: '🍭', desc: 'Federnder Boden – alles hüpft!',
    g: 1, grip: 1, bounce: 0.45, fuelDrain: 1.3, coinMult: 45, unlock: 1300,
    terrain: { amp: 120, freq: 1.2, rough: 0.6, growth: 850, ramps: 0.25, craters: 0, pads: 0.2 },
    col: { sky1: '#ff9ad5', sky2: '#fff0fa', far: '#ffc4e6', mid: '#ffb0d8', g1: '#c0587e', g2: '#7d2a4e', top: '#ff6fb5', top2: '#ffe3f1', deco: 'lollipop' } },
  { id: 'asteroid', name: 'Asteroidengürtel', icon: '☄️', desc: 'Fast schwerelos. Riesen-Krater.',
    g: 0.22, grip: 0.9, bounce: 0.1, fuelDrain: 1.4, coinMult: 70, unlock: 1400,
    terrain: { amp: 170, freq: 1.0, rough: 1.0, growth: 800, ramps: 0.3, craters: 0.8, pads: 0.2 },
    col: { sky1: '#000000', sky2: '#120a2a', far: '#1a1530', mid: '#251d40', g1: '#5a5060', g2: '#2a2430', top: '#9a8fb0', top2: '#cfc5e5', deco: 'crystal', stars: true } },
  { id: 'rainbow', name: 'Regenbogen-Straße', icon: '🌈', desc: 'Das ultimative Ziel. Alles auf einmal.',
    g: 0.8, grip: 1.05, bounce: 0.2, fuelDrain: 1.5, coinMult: 110, unlock: 1500,
    terrain: { amp: 160, freq: 1.1, rough: 0.9, growth: 750, ramps: 0.5, craters: 0.3, pads: 0.5 },
    col: { sky1: '#1a0b3d', sky2: '#4a2b8c', far: '#2f1d63', mid: '#3d2780', g1: '#2a1b5a', g2: '#120a2a', top: '#ffffff', top2: '#ffd700', deco: 'star', stars: true, rainbow: true } },
];

// ---------- Fahrzeuge ----------
// Lokale Koordinaten: Chassis-Schwerpunkt = (0,0), +x = vorne, +y = unten
const VEHICLES = [
  { id: 'classic', name: 'Kompakt', price: 0, desc: 'Ein ehrlicher Kleinwagen. Ausgewogen.',
    mult: { engine: 1, speed: 1, fuel: 1, grip: 1, air: 1, nitro: 1 }, mass: 10, costMult: 1,
    wheelR: 17, wheels: [[-36, 20], [37, 20]], susp: 1,
    body: [[-52, 8], [-54, -6], [-44, -12], [-22, -14], [-10, -30], [18, -30], [30, -14], [52, -10], [56, 4], [50, 10], [-48, 12]],
    head: [0, -42], hull: [[-54, -6], [56, 4], [-10, -30], [18, -30], [-48, 12], [50, 10]] },
  { id: 'buggy', name: 'Strandbuggy', price: 2500, desc: 'Leicht, wendig, super in der Luft – aber kleiner Tank.',
    mult: { engine: 0.95, speed: 1.05, fuel: 0.8, grip: 1.05, air: 1.6, nitro: 1 }, mass: 7, costMult: 1.4,
    wheelR: 20, wheels: [[-38, 22], [38, 22]], susp: 1.3,
    body: [[-46, 8], [-48, -4], [-30, -8], [-14, -26], [10, -28], [24, -8], [48, -4], [50, 6], [-40, 12]],
    head: [-2, -38], hull: [[-48, -4], [50, 6], [-14, -26], [10, -28], [-40, 12]] },
  { id: 'pickup', name: 'Pickup', price: 9000, desc: 'Schwer und stabil, riesiger Tank.',
    mult: { engine: 1.1, speed: 0.95, fuel: 1.6, grip: 1.05, air: 0.8, nitro: 0.9 }, mass: 14, costMult: 2,
    wheelR: 19, wheels: [[-44, 22], [44, 22]], susp: 1.1,
    body: [[-64, 10], [-66, -10], [-6, -10], [0, -32], [28, -32], [38, -12], [64, -8], [66, 6], [58, 12], [-58, 14]],
    head: [14, -44], hull: [[-66, -10], [66, 6], [0, -32], [28, -32], [-58, 14], [58, 12]] },
  { id: 'rally', name: 'Rallye-Flitzer', price: 30000, desc: 'Allrad-Grip für jede Oberfläche.',
    mult: { engine: 1.2, speed: 1.15, fuel: 1.1, grip: 1.5, air: 1.1, nitro: 1.1 }, mass: 10, costMult: 3,
    wheelR: 18, wheels: [[-38, 20], [38, 20]], susp: 1.2, awd: true,
    body: [[-54, 8], [-56, -6], [-40, -12], [-24, -14], [-12, -30], [16, -30], [30, -14], [56, -8], [58, 4], [50, 12], [-50, 12]],
    head: [2, -42], hull: [[-56, -6], [58, 4], [-12, -30], [16, -30], [-50, 12], [50, 12]] },
  { id: 'monster', name: 'Monstertruck', price: 90000, desc: 'Riesenräder schlucken jedes Hindernis.',
    mult: { engine: 1.4, speed: 1.1, fuel: 1.3, grip: 1.3, air: 0.9, nitro: 1.1 }, mass: 14, costMult: 4.5,
    wheelR: 30, wheels: [[-44, 36], [44, 36]], susp: 1.6, awd: true,
    body: [[-58, 8], [-60, -8], [-18, -10], [-8, -32], [22, -32], [32, -12], [60, -8], [62, 6], [-54, 12]],
    head: [8, -44], hull: [[-60, -8], [62, 6], [-8, -32], [22, -32], [-54, 12]] },
  { id: 'sport', name: 'Supersportler', price: 300000, desc: 'Brutale Leistung, Höchstgeschwindigkeit.',
    mult: { engine: 1.8, speed: 1.6, fuel: 1.2, grip: 1.3, air: 1, nitro: 1.3 }, mass: 11, costMult: 7,
    wheelR: 17, wheels: [[-40, 16], [42, 16]], susp: 1,
    body: [[-60, 6], [-62, -6], [-40, -12], [-14, -26], [14, -26], [40, -10], [62, -4], [64, 4], [-56, 10]],
    head: [0, -36], hull: [[-62, -6], [64, 4], [-14, -26], [14, -26], [-56, 10]] },
  { id: 'rover', name: 'Mondrover', price: 1000000, desc: 'Für Raumfahrer: Top-Luftkontrolle & Sparsamkeit.',
    mult: { engine: 1.8, speed: 1.5, fuel: 2, grip: 1.4, air: 2.2, nitro: 1.4 }, mass: 9, costMult: 11,
    wheelR: 22, wheels: [[-44, 26], [44, 26]], susp: 1.5, awd: true,
    body: [[-56, 8], [-58, -10], [-30, -14], [-26, -30], [20, -30], [30, -14], [58, -10], [58, 8], [-52, 12]],
    head: [-4, -44], hull: [[-58, -10], [58, 8], [-26, -30], [20, -30], [-52, 12]] },
  { id: 'rocket', name: 'Raketenwagen', price: 4000000, desc: 'Nitro ohne Ende. Gefährlich schnell.',
    mult: { engine: 2.4, speed: 2.1, fuel: 1.6, grip: 1.5, air: 1.4, nitro: 2.2 }, mass: 11, costMult: 16,
    wheelR: 18, wheels: [[-42, 16], [44, 16]], susp: 1.1, rocket: true,
    body: [[-66, 6], [-70, -14], [-50, -12], [-18, -26], [16, -26], [46, -8], [72, -2], [72, 6], [-60, 10]],
    head: [-2, -36], hull: [[-70, -14], [72, 6], [-18, -26], [16, -26], [-60, 10]] },
  { id: 'hover', name: 'Quanten-Gleiter', price: 15000000, desc: 'Das Endziel der Evolution.',
    mult: { engine: 3.2, speed: 2.8, fuel: 2.4, grip: 1.8, air: 2.5, nitro: 2.5 }, mass: 10, costMult: 24,
    wheelR: 19, wheels: [[-44, 18], [44, 18]], susp: 1.4, awd: true, glow: true,
    body: [[-64, 4], [-66, -8], [-36, -16], [-16, -30], [18, -30], [40, -14], [66, -6], [68, 4], [40, 12], [-40, 12]],
    head: [0, -42], hull: [[-66, -8], [68, 4], [-16, -30], [18, -30], [-40, 12], [40, 12]] },
];

// ---------- Fahrzeug-Upgrades ----------
const UPGRADES = [
  { id: 'engine', name: 'Motor', icon: '⚙️', base: 60, desc: l => `+${Math.round(l * 9)}% Kraft, +${Math.round(l * 6)}% Spitze` },
  { id: 'fuel', name: 'Tank', icon: '⛽', base: 50, desc: l => `+${Math.round(l * 12)}% Treibstoff` },
  { id: 'grip', name: 'Reifen', icon: '🛞', base: 55, desc: l => `+${Math.round(l * 8)}% Grip` },
  { id: 'susp', name: 'Federung', icon: '🔩', base: 45, desc: l => `+${Math.round(l * 5)}% Stabilität` },
  { id: 'air', name: 'Aerodynamik', icon: '🪽', base: 40, desc: l => `+${Math.round(l * 7)}% Luftkontrolle` },
  { id: 'nitro', name: 'Nitro', icon: '🔥', base: 80, desc: l => `${1 + Math.floor(l / 5)} Ladungen, +${l * 6}% Schub` },
];

// ---------- Werkstatt (global) ----------
const GLOBAL_UPS = [
  { id: 'magnet', name: 'Münzmagnet', icon: '🧲', base: 150, max: 25, desc: l => `Radius ${Math.round(magnetRadius(l) / PX * 10) / 10} m` },
  { id: 'value', name: 'Münzwert', icon: '💰', base: 200, max: 50, desc: l => `+${l * 10}% Münzen` },
  { id: 'cans', name: 'Tankstellen', icon: '🛢️', base: 180, max: 15, desc: l => `Kanister ${l * 4}% häufiger` },
  { id: 'helmet', name: 'Sturzhelm', icon: '⛑️', base: 5000, max: 3, mult: 8, desc: l => `${l} Rettung(en) pro Lauf` },
  { id: 'launch', name: 'Startschuss', icon: '🚀', base: 400, max: 20, desc: l => l ? `Start mit ${l * 3} m/s` : 'Kein Startschub' },
  { id: 'stunt', name: 'Stunt-Bonus', icon: '🤸', base: 250, max: 30, desc: l => `+${l * 15}% Stunt-Münzen` },
];

// ---------- Talente (Evo-Kerne, bleiben bei Neugeburt) ----------
const TALENTS = [
  { id: 'gold', name: 'Goldader', icon: '🪙', max: 25, cost: l => 1 + l, desc: l => `+${l * 15}% Münzen` },
  { id: 'cheap', name: 'Feilscher', icon: '🏷️', max: 10, cost: l => 2 + l * 2, desc: l => `-${l * 4}% Upgrade-Kosten` },
  { id: 'tank', name: 'Großtank', icon: '🛢️', max: 10, cost: l => 1 + l, desc: l => `+${l * 8}% Treibstoff` },
  { id: 'turbo', name: 'Turbolader', icon: '⚡', max: 10, cost: l => 2 + l, desc: l => `+${l * 5}% Motorkraft` },
  { id: 'luck', name: 'Glückspilz', icon: '🍀', max: 5, cost: l => 3 + l * 2, desc: l => `+${l * 20}% Edelstein-Chance` },
  { id: 'start', name: 'Startkapital', icon: '💼', max: 10, cost: l => 1 + l, desc: l => `${fmt(startCapital(l))} Münzen nach Neugeburt` },
  { id: 'stunt', name: 'Stuntmeister', icon: '🌀', max: 10, cost: l => 1 + l, desc: l => `+${l * 25}% Stunt-Belohnung` },
  { id: 'nitro', name: 'Nitro-Reserve', icon: '🧪', max: 3, cost: l => 5 + l * 5, desc: l => `+${l} Nitro pro Lauf` },
  { id: 'miss', name: 'Auftragsprofi', icon: '📜', max: 10, cost: l => 2 + l, desc: l => `+${l * 20}% Missions-Belohnung` },
  { id: 'cap', name: 'Evolutionsgrenze', icon: '🧬', max: 6, cost: l => 4 + l * 4, desc: l => `Max. Upgrade-Stufe +${l * 5}` },
];

// ---------- Evolutionsstufen ----------
const EVO_STAGES = [
  { need: 0, name: 'Schrottkarre' },
  { need: 10, name: 'Gebraucht' },
  { need: 25, name: 'Getunt' },
  { need: 45, name: 'Sportlich' },
  { need: 70, name: 'Elite' },
  { need: 100, name: 'Legende' },
  { need: 140, name: 'Mythisch' },
];

// ---------- Lackierungen & Spuren ----------
const PAINTS = [
  { id: 'red', name: 'Rot', c: '#e53935', price: 0 },
  { id: 'blue', name: 'Blau', c: '#1e88e5', price: 0 },
  { id: 'green', name: 'Grün', c: '#43a047', price: 3 },
  { id: 'yellow', name: 'Gelb', c: '#fdd835', price: 3 },
  { id: 'orange', name: 'Orange', c: '#fb8c00', price: 3 },
  { id: 'purple', name: 'Lila', c: '#8e24aa', price: 5 },
  { id: 'white', name: 'Weiß', c: '#f5f5f5', price: 5 },
  { id: 'black', name: 'Schwarz', c: '#263238', price: 5 },
  { id: 'pink', name: 'Pink', c: '#ff4fa3', price: 8 },
  { id: 'cyan', name: 'Türkis', c: '#00bcd4', price: 8 },
  { id: 'gold', name: 'Gold', c: '#ffc107', price: 25, metal: true },
  { id: 'chrome', name: 'Chrom', c: '#cfd8dc', price: 40, metal: true },
  { id: 'rainbow', name: 'Regenbogen', c: 'rainbow', price: 80 },
];
const TRAILS = [
  { id: 'none', name: 'Keine', price: 0 },
  { id: 'smoke', name: 'Rauch', price: 5 },
  { id: 'fire', name: 'Feuer', price: 15 },
  { id: 'stars', name: 'Sterne', price: 25 },
  { id: 'rainbow', name: 'Regenbogen', price: 50 },
  { id: 'coins', name: 'Goldregen', price: 100 },
];

// ---------- Tagesmodifikatoren ----------
const MODIFIERS = [
  { id: 'lowg', name: 'Mondsprung', desc: 'Halbe Schwerkraft', g: 0.5 },
  { id: 'highg', name: 'Schwere Luft', desc: '+40% Schwerkraft', g: 1.4 },
  { id: 'ice', name: 'Glatteis', desc: 'Halber Grip', grip: 0.5 },
  { id: 'turbo', name: 'Turbo-Tag', desc: '+50% Motorkraft', engine: 1.5 },
  { id: 'dry', name: 'Spritknappheit', desc: '-35% Treibstoff', fuel: 0.65 },
  { id: 'bouncy', name: 'Gummiboden', desc: 'Alles federt', bounce: 0.5 },
  { id: 'nonitro', name: 'Puristen-Lauf', desc: 'Kein Nitro, aber +30% Grip', nitro: 0, grip: 1.3 },
  { id: 'gold', name: 'Goldrausch', desc: 'Doppelte Münzen, -20% Sprit', coins: 2, fuel: 0.8 },
];

// ---------- Missionsvorlagen ----------
const MISSION_TYPES = ['dist', 'coins', 'flips', 'air', 'speed', 'cans', 'total', 'nonitro', 'bigair', 'world'];

// ---------- Erfolge ----------
// stat: Statistik-Schlüssel, steps: Stufen, gems: Belohnung pro Stufe
const ACHIEVEMENTS = [
  { id: 'dist', name: 'Weltenbummler', icon: '🛣️', stat: 'totalDist', unit: 'm', steps: [1000, 10000, 50000, 200000, 1000000, 5000000] },
  { id: 'runs', name: 'Dauerfahrer', icon: '🔁', stat: 'runs', unit: 'Läufe', steps: [10, 50, 200, 500, 1500, 5000] },
  { id: 'flips', name: 'Akrobat', icon: '🌀', stat: 'flips', unit: 'Überschläge', steps: [5, 50, 250, 1000, 5000, 20000] },
  { id: 'coins', name: 'Goldgräber', icon: '🪙', stat: 'coinsEarned', unit: 'Münzen', steps: [10000, 100000, 1e6, 1e7, 1e8, 1e9] },
  { id: 'air', name: 'Vielflieger', icon: '✈️', stat: 'airTotal', unit: 's Flug', steps: [60, 600, 3000, 10000, 40000, 100000] },
  { id: 'speed', name: 'Raser', icon: '💨', stat: 'maxSpeed', unit: 'km/h', steps: [80, 130, 180, 250, 350, 500] },
  { id: 'cans', name: 'Tankwart', icon: '⛽', stat: 'cans', unit: 'Kanister', steps: [20, 200, 1000, 5000, 20000, 60000] },
  { id: 'best', name: 'Grenzgänger', icon: '🏁', stat: 'bestAny', unit: 'm Rekord', steps: [500, 1000, 2000, 3500, 5000, 8000] },
  { id: 'worlds', name: 'Entdecker', icon: '🗺️', stat: 'worlds', unit: 'Welten', steps: [2, 4, 6, 8, 10, 12] },
  { id: 'cars', name: 'Sammler', icon: '🚗', stat: 'cars', unit: 'Fahrzeuge', steps: [2, 3, 5, 7, 8, 9] },
  { id: 'evo', name: 'Evolution', icon: '🧬', stat: 'maxEvo', unit: 'Evo-Stufe', steps: [1, 2, 3, 4, 5, 6] },
  { id: 'missions', name: 'Auftragskiller', icon: '📜', stat: 'missions', unit: 'Missionen', steps: [5, 25, 100, 300, 1000, 3000] },
  { id: 'rebirth', name: 'Wiedergeburt', icon: '♻️', stat: 'rebirths', unit: 'Neugeburten', steps: [1, 3, 5, 10, 20, 50] },
  { id: 'crash', name: 'Bruchpilot', icon: '💥', stat: 'crashes', unit: 'Unfälle', steps: [10, 50, 200, 1000, 3000, 10000] },
  { id: 'gems', name: 'Juwelier', icon: '💎', stat: 'gemsFound', unit: 'Edelsteine gefunden', steps: [5, 25, 100, 300, 1000, 3000] },
  { id: 'daily', name: 'Stammgast', icon: '📅', stat: 'dailies', unit: 'Tagesaufgaben', steps: [1, 7, 30, 100, 250, 365] },
  { id: 'combo', name: 'Kombo-König', icon: '🔥', stat: 'maxFlipsRun', unit: 'Überschläge/Lauf', steps: [3, 6, 10, 20, 35, 60] },
];

// ---------- Hilfsfunktionen für Werte ----------
function magnetRadius(l) { return l <= 0 ? 0 : 30 + l * 12; }
function startCapital(l) { return l <= 0 ? 0 : Math.round(1000 * Math.pow(l, 2.5)); }
function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return String(n);
  const u = ['', 'K', 'M', 'Mrd', 'B', 'T', 'Qa', 'Qi'];
  let i = 0; let v = n;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + u[i];
}
