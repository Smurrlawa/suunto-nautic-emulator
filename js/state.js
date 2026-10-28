/* Einstellungen (Standardwerte laut Handbuch), Laufzeitzustand, Persistenz */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});
  const KEY = 'suunto-nautic-emulator-v1';

  let gasId = 1;
  function newGas(o2 = 21, he = 0, ppo2 = 1.4, state = 'active') {
    // Standard: Luft, ppO2 1,4 bar, Flaschengröße 12 l (Kap. 5.1)
    return { id: gasId++, o2, he, ppo2, state, tank: 12, pods: [null, null] };
  }

  function modeDefaults() {
    return {
      gases: [newGas()],
      algo: {
        enabled: true,           // Kap. 8.7
        cons: 'medium',          // Kap. 8.2: Standard "Mittel" 40/85
        custom: { lo: 50, hi: 75 }, // Wert aus Screenshot "Custom 50/75"
        profile: 'stepped',      // Screenshot Algorithmus-Menü zeigt "Stepped" (Standard nicht dokumentiert)
        safety: '3',             // Kap. 4.5: Standard 3 Minuten
        lastStop: 3,             // Kap. 8.5: Standard 3 m
        altitude: 0,             // Kap. 8.6: 0–300 m Standard
      },
      alarms: { depth: [], time: [], tank: [], ndl: [], gastime: [], sidemount: [], muteAudio: false, muteVib: false },
      // Kap. 4.6, Screenshot "SWITCH WINDOW": View 1 = Active gas, ppO2/MOD; View 2 = Tank pressure, Gas consumpt…
      // View 3 ist im Screenshot abgeschnitten -> hier Kompass (Annahme)
      views: [
        { type: 'double', f: ['activeGas', 'ppo2Mod'] },
        { type: 'double', f: ['tankPressure', 'gasConsumption'] },
        { type: 'large', f: ['compass'] },
      ],
      viewIndex: 0,
      decoField: 'ndl', // 'ndl' | 'ndltts' (Hinweis in Kap. 4.5)
      extra: { gps: true, route: true, startDepth: 1.2, endTime: 5, water: 'salt', feeling: false },
    };
  }

  function defaults() {
    return {
      setupDone: false,
      language: 'en',
      units: { system: 'metric', depth: 'm', pressure: 'bar', temp: 'C', volume: 'l' },
      timeFormat: '24h',
      autoTime: true,
      timeOffset: 0,
      orientation: 'left', // Kap. 3.8: Standard "Tasten links"
      brightness: 'medium',
      sounds: { tones: true, vibration: true },
      flashlight: false,
      buttonLock: false,
      passcode: { enabled: false, code: null, fails: 0 },
      bt: { discovery: true, airplane: false, sensors: [] },
      nav: { declination: 0, compassUnit: 'deg', posFormat: 'WGS84 Hd°m\'s.s', mapStyle: 'Light' },
      diveMode: 'single',
      modes: { single: modeDefaults(), multi: modeDefaults() },
      pois: [],
    };
  }

  function envDefaults() {
    return {
      depth: 0,               // wahre Tiefe (m)
      targetDepth: 0,
      rate: 10,               // m/min für die Tiefensteuerung
      wetMode: 'auto',        // Wasserkontakt-Sensor: auto | dry | wet
      rho: 1025,              // reale Wasserdichte
      psurf: 1.01325,         // Luftdruck an der Oberfläche (bar)
      tempWater: 24, tempAir: 28,
      battery: 97, charging: false,
      heading: 329, compassCal: true, magnetic: false,
      gps: 'ok', gpsFixSec: 8,
      lat: 60.169497, lon: 24.935472,
      hrBeltOn: false, hr: 74,
      sensorsNearby: [{ serial: 'X070089', name: 'Suunto HR belt' }, { serial: 'C039923', name: 'Suunto HR belt' }],
      pods: [
        { serial: '1234567890', pressure: 201, battery: 'ok', inRange: true, active: true },
        { serial: '5678901234', pressure: 183, battery: 'ok', inRange: true, active: true },
      ],
      sac: 15,                // Atemminutenvolumen an der Oberfläche (l/min)
      breatheFrom: 0,         // Sidemount: aus welcher Flasche geatmet wird
      timeScale: 1,
      app: false, updateAvailable: false,
      weather: { temp: 18, wind: 5, windDir: 225, gust: 9, hum: 72, rain: 0.2, sunrise: '06:12', sunset: '19:48', moon: 'Zunehmend', forecast: [19, 20, 21, 19, 17] },
      tides: { height: 0.6, high: { t: '14:32', h: 1.2 }, low: { t: '20:47', h: 0.2 }, wave: 0.8, moon: 'Zunehmend' },
    };
  }

  const state = {
    settings: defaults(),
    env: envDefaults(),
    logs: [],
    tissues: null,
    cns: 0,
    otuDives: [],          // [{end, otu}]
    deviationUntil: 0,
    lastDiveEnd: 0,
    simOffset: 0,          // simulierte Zeit = echte Zeit + simOffset
    savedAt: 0,
  };

  state.now = function () { return Date.now() + state.simOffset; };
  state.mode = function () { return state.settings.modes[state.settings.diveMode]; };
  state.newGas = newGas;
  state.modeDefaults = modeDefaults;

  state.gf = function (m) {
    m = m || state.mode();
    const c = m.algo.cons;
    if (c === 'low') return { lo: 45, hi: 95 };
    if (c === 'high') return { lo: 35, hi: 75 };
    if (c === 'custom') return m.algo.custom;
    return { lo: 40, hi: 85 };
  };
  state.activeGas = function (m) {
    m = m || state.mode();
    return m.gases.find((g) => g.state === 'active') || m.gases[0];
  };
  state.usableGases = function (m) {
    m = m || state.mode();
    if (state.settings.diveMode === 'single') return [state.activeGas(m)];
    return m.gases.filter((g) => g.state !== 'disabled');
  };
  state.waterRho = function (m) {
    const w = (m || state.mode()).extra.water;
    return w === 'fresh' ? 1000 : w === 'salt' ? 1025 : 1019.716; // EN13319
  };
  // Höheneinstellung -> angenommener Oberflächendruck für den Algorithmus
  state.algoSurf = function (m) {
    const a = (m || state.mode()).algo.altitude;
    return a === 2 ? 0.701 : a === 1 ? 0.846 : null; // null = gemessener Oberflächendruck
  };

  state.save = function () {
    try {
      const data = {
        settings: state.settings, logs: state.logs, tissues: state.tissues && state.tissues.toJSON(),
        cns: state.cns, otuDives: state.otuDives, deviationUntil: state.deviationUntil,
        lastDiveEnd: state.lastDiveEnd, simOffset: state.simOffset, savedAt: Date.now(), gasId,
        env: { battery: state.env.battery },
      };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* privater Modus o. ä. */ }
  };

  state.load = function () {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
    state.tissues = new SN.Deco.Tissues();
    state.tissues.reset(state.env.psurf);
    if (!data) return false;
    const d = defaults();
    state.settings = Object.assign(d, data.settings);
    state.settings.units = Object.assign(defaults().units, state.settings.units);
    for (const k of ['single', 'multi']) {
      state.settings.modes[k] = Object.assign(modeDefaults(), state.settings.modes[k]);
      const md = state.settings.modes[k];
      md.algo = Object.assign(modeDefaults().algo, md.algo);
      md.extra = Object.assign(modeDefaults().extra, md.extra);
      md.alarms = Object.assign(modeDefaults().alarms, md.alarms);
    }
    state.logs = data.logs || [];
    if (data.tissues) state.tissues = new SN.Deco.Tissues(data.tissues);
    state.cns = data.cns || 0;
    state.otuDives = data.otuDives || [];
    state.deviationUntil = data.deviationUntil || 0;
    state.lastDiveEnd = data.lastDiveEnd || 0;
    state.simOffset = data.simOffset || 0;
    gasId = data.gasId || 100;
    if (data.env && data.env.battery != null) state.env.battery = data.env.battery;
    state.savedAt = data.savedAt || Date.now();
    return true;
  };

  state.factoryReset = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    state.settings = defaults();
    state.logs = [];
    state.tissues = new SN.Deco.Tissues();
    state.tissues.reset(state.env.psurf);
    state.cns = 0; state.otuDives = []; state.deviationUntil = 0; state.lastDiveEnd = 0;
  };

  SN.state = state;
})(typeof window !== 'undefined' ? window : globalThis);
