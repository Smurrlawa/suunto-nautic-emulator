/* Simulation: Umgebung -> Sensorwerte -> Tauchgangslogik (Kap. 4, 6, 7, 8, 9, 11) */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});
  const D = SN.Deco;
  const S = SN.state;

  const live = {
    pamb: 1.01325, depth: 0, rawDepth: 0, temp: 24, wet: false,
    ascRate: 0, ascFastSince: null, ascLevel: 0,
    ndl: 100, tts: 0, ceiling: 0, inDeco: false, stopDepth: 0, stopTime: 0, plan: null,
    deko: 0, inWindow: false, above: 'none',
    ppo2: 0.21, gf99: 0, surfGF: 0, delta5: 0, at5: 0,
    rmv: null, gasTime: null, gpsFix: false, gpsSearchStart: 0,
    hrFound: false, aod: false, sleeping: false, deep: false, lastInput: 0,
  };
  let dive = null;           // aktiver Tauchgang
  let lastDecoCalc = 0;
  let prevDepth = 0;

  function modeNow() { return S.mode(); }
  function algoEnv() { return { psurf: S.env.psurf, rho: S.waterRho() }; }
  function dispDepth(pamb) { return Math.max(0, D.dAt(pamb, algoEnv())); }

  /** Flaschendruck für Gas (verbundene PODs) */
  function podsFor(gas) {
    if (!gas || !gas.pods) return [];
    const out = [];
    gas.pods.forEach((serial, slot) => {
      if (!serial) return;
      const p = S.env.pods.find((x) => x.serial === serial);
      out.push({ slot, serial, pod: p, data: !!(p && p.inRange && p.active), pressure: p ? p.pressure : null });
    });
    return out;
  }

  function totalCNS() { return S.cns; }
  function dailyOTU() {
    const now = S.now();
    let o = 0;
    for (const d of S.otuDives) if (now - d.end < 86400000) o += d.otu;
    if (dive) o += dive.otu;
    return o;
  }

  function startDive() {
    const m = modeNow();
    const now = S.now();
    const gas = S.activeGas(m);
    dive = {
      start: now, runtime: 0, maxDepth: 0, depthSum: 0, depthTime: 0,
      samples: [], sampleT: 0, surfacedAt: null, lastSurfaced: null,
      anchor: 0, everDeco: false, decoEnteredAlarm: false,
      safety: { required: false, remaining: 0, total: 0, started: false, done: false, shallowDeco: 0 },
      brokenSince: null, deviation: S.deviationUntil > now, otu: 0,
      tempMin: 99, tempMax: -99, tempSum: 0, tempN: 0,
      gasUse: {}, gasSamples: [], rmvSum: 0, rmvN: 0, hrSum: 0, hrN: 0,
      surfaceBefore: S.lastDiveEnd ? (now - S.lastDiveEnd) / 1000 : null,
      gasesUsed: [gas.id], dismissed: null, lastSuggest: null,
      wasLocked: S.settings.passcode.enabled && SN.app && SN.app.locked,
      mode: S.settings.diveMode,
    };
    for (const g of S.usableGases(m)) {
      dive.gasUse[g.id] = { start: podsFor(g).map((p) => p.data ? p.pressure : null), end: null, rmv: [] };
    }
    live.hrFound = false;
    if (SN.app) SN.app.onDiveStart();
  }

  function endDive() {
    const m = modeNow();
    const end = dive.lastSurfaced || S.now();
    const gasList = S.usableGases(m).map((g) => {
      const u = dive.gasUse[g.id] || { start: [] };
      const pods = podsFor(g);
      const avg = u.rmv && u.rmv.length ? u.rmv.reduce((a, b) => a + b, 0) / u.rmv.length : null;
      return {
        name: SN.fmt.gasName(g), o2: g.o2, he: g.he, ppo2: g.ppo2, tank: g.tank, active: g.state === 'active',
        startP: u.start && u.start.filter((x) => x != null), endP: pods.filter((p) => p.data).map((p) => p.pressure), avgRmv: avg,
      };
    });
    const desat = desatTime(S.tissues);
    const log = {
      id: Date.now(), n: S.logs.length + 1, start: dive.start, end, duration: (end - dive.start) / 1000,
      maxDepth: dive.maxDepth, avgDepth: dive.depthTime ? dive.depthSum / dive.depthTime : 0,
      samples: dive.samples, tempMin: dive.tempMin, tempMax: dive.tempMax, tempAvg: dive.tempN ? dive.tempSum / dive.tempN : null,
      gases: gasList, gf: Object.assign({}, S.gf(m)), algoOn: m.algo.enabled, cns: Math.ceil(S.cns), otu: Math.ceil(dive.otu),
      hrAvg: dive.hrN ? Math.round(dive.hrSum / dive.hrN) : null, surfaceBefore: dive.surfaceBefore,
      tissues: S.tissues.chart(S.env.psurf), deviation: dive.deviation, mode: dive.mode, feeling: null,
      desat, noFly: noFlyFor(desat, dive.deviation),
    };
    S.logs.push(log);
    S.otuDives.push({ end, otu: dive.otu });
    S.lastDiveEnd = end;
    // Multigas: Gas mit niedrigstem O2 wird aktiv (Kap. 5.2)
    if (S.settings.diveMode === 'multi') {
      const usable = m.gases.filter((g) => g.state !== 'disabled');
      const low = usable.reduce((a, b) => (b.o2 < a.o2 ? b : a), usable[0]);
      m.gases.forEach((g) => { if (g.state === 'active') g.state = 'enabled'; });
      low.state = 'active';
    }
    const wasLocked = dive.wasLocked;
    dive = null;
    S.save();
    if (SN.app) SN.app.onDiveEnd(log, wasLocked);
  }

  // Entsättigungszeit (s): bis alle Kompartimente nahezu im Gleichgewicht (Annahme: < 0,03 bar Übersättigung)
  function desatTime(t) {
    const ps = S.env.psurf;
    const eq = (ps - D.PH2O) * 0.7902;
    const HTN = [5.0, 8.0, 12.5, 18.5, 27.0, 38.3, 54.3, 77.0, 109, 146, 187, 239, 305, 390, 498, 635];
    let max = 0;
    for (let i = 0; i < 16; i++) {
      const ex = t.n2[i] + t.he[i] - eq;
      if (ex > 0.03) max = Math.max(max, HTN[i] * Math.log2(ex / 0.03));
    }
    return max * 60;
  }
  // Kap. 11.1: min. 12 h bzw. Entsättigungszeit; < 75 min -> keine; Algorithmusabweichung -> 48 h
  function noFlyFor(desat, deviation) {
    if (deviation) return 48 * 3600;
    if (desat < 75 * 60) return 0;
    return Math.max(12 * 3600, desat);
  }
  function noFlyRemaining() {
    const last = S.logs[S.logs.length - 1];
    if (!last) return 0;
    const rem = last.noFly - (S.now() - last.end) / 1000;
    return Math.max(0, rem);
  }

  /** ein Simulationsschritt, dt in Sekunden (<= 1) */
  function step(dt) {
    const env = S.env;
    const m = modeNow();
    // Tiefensteuerung
    if (env.depth !== env.targetDepth) {
      const dz = env.rate / 60 * dt;
      if (Math.abs(env.targetDepth - env.depth) <= dz) env.depth = env.targetDepth;
      else env.depth += Math.sign(env.targetDepth - env.depth) * dz;
    }
    env.depth = Math.max(0, env.depth);
    const wet = env.wetMode === 'dry' ? false : env.wetMode === 'wet' ? true : env.depth > 0.05;
    live.wet = wet;
    const pamb = env.psurf + env.depth * env.rho * 9.80665e-5;
    live.pamb = pamb;
    live.rawDepth = env.depth;
    const d = dispDepth(pamb);
    live.depth = d;
    // Temperatur: im Wasser Wassertemperatur, sonst Luft (Sensor träge)
    const tt = wet ? env.tempWater : env.tempAir;
    live.temp += (tt - live.temp) * Math.min(1, dt / 30);

    // Aufstiegsgeschwindigkeit (geglättet)
    const inst = (prevDepth - d) / dt * 60;
    prevDepth = d;
    live.ascRate += (inst - live.ascRate) * Math.min(1, dt / 2);

    // Tauchgang starten/beenden (Kap. 4.2)
    const sd = m.extra.startDepth;
    const thr = wet ? sd : sd + 1.8;
    if (!dive && d >= thr && !(SN.app && SN.app.power === 'off')) startDive();

    const gas = dive ? S.activeGas(m) : { o2: 21, he: 0 };
    S.tissues.load(pamb, 0, dt / 60, gas);
    const ppo2 = (pamb - 0.0) * gas.o2 / 100;
    live.ppo2 = ppo2;
    if (dive) {
      S.cns += D.cnsPerMin(ppo2) * dt / 60;
      dive.otu += D.otuPerMin(ppo2) * dt / 60;
    } else {
      S.cns *= Math.pow(0.5, dt / 5400); // Halbwertszeit 90 min
    }

    if (dive) diveStep(dt, d, pamb, gas, m, thr);

    // Akku
    let drain = 0.6 + (S.settings.brightness === 'high' ? 0.6 : 0) + (S.settings.flashlight ? 4 : 0) + (dive ? 0.6 : 0);
    if (live.sleeping) drain = 0.05;
    if (env.charging) env.battery = Math.min(100, env.battery + 30 * dt / 3600);
    else env.battery = Math.max(0, env.battery - drain * dt / 3600);

    // GPS-Fix
    if (m.extra.gps && !dive) {
      if (env.gps === 'ok') {
        if (!live.gpsSearchStart) live.gpsSearchStart = S.now();
        live.gpsFix = (S.now() - live.gpsSearchStart) / 1000 >= env.gpsFixSec;
      } else { live.gpsFix = false; live.gpsSearchStart = 0; }
    } else if (!m.extra.gps) { live.gpsFix = false; live.gpsSearchStart = 0; }
    else if (dive && d > 1) { live.gpsFix = false; live.gpsSearchStart = 0; }
  }

  function diveStep(dt, d, pamb, gas, m, thr) {
    const env = S.env;
    dive.runtime += dt;
    if (d > dive.maxDepth) dive.maxDepth = d;
    if (d >= thr) { dive.depthSum += d * dt; dive.depthTime += dt; }
    dive.tempMin = Math.min(dive.tempMin, live.temp); dive.tempMax = Math.max(dive.tempMax, live.temp);
    dive.tempSum += live.temp * dt; dive.tempN += dt;
    if (S.settings.bt.sensors.length && env.hrBeltOn) {
      if (dive.runtime > 4) live.hrFound = true;
      if (live.hrFound) { dive.hrSum += env.hr * dt; dive.hrN += dt; }
    } else live.hrFound = false;
    if (d > 200) dive.deviation = true; // max. Gerätetiefe 200 m (Kap. 9.2)

    // Flaschendruck: Verbrauch vom Tank POD des aktiven Gases
    const pods = podsFor(gas).filter((p) => p.pod);
    if (pods.length) {
      const liters = env.sac * pamb / 1.01325 * dt / 60;
      let idx = 0;
      if (pods.length > 1) idx = env.breatheFrom === 1 ? 1 : 0;
      const p = pods[Math.min(idx, pods.length - 1)].pod;
      p.pressure = Math.max(0, p.pressure - liters / gas.tank);
    }

    // Abtastung alle 10 s (Kap. 11)
    dive.sampleT += dt;
    if (dive.sampleT >= 10 || dive.samples.length === 0) {
      dive.sampleT = 0;
      dive.samples.push({ t: dive.runtime, d: Math.round(d * 10) / 10, tp: Math.round(live.temp * 10) / 10 });
    }
    // Gasvolumen für AMV (Kap. 6.3), alle 5 s
    const gp = podsFor(gas).filter((p) => p.data);
    if (gp.length && Math.floor(dive.runtime / 5) !== Math.floor((dive.runtime - dt) / 5)) {
      const tc = 293.15 / (273.15 + live.temp);
      const V = gp.reduce((a, p) => a + gas.tank * p.pressure / 1.01325 * tc, 0);
      dive.gasSamples.push({ t: dive.runtime, V, d, gas: gas.id });
      while (dive.gasSamples.length && dive.runtime - dive.gasSamples[0].t > 170) dive.gasSamples.shift();
    }

    // Oberfläche während des Tauchgangs / Ende
    if (d < thr) {
      if (dive.surfacedAt == null) { dive.surfacedAt = dive.runtime; dive.lastSurfaced = S.now(); }
      if (dive.runtime - dive.surfacedAt >= m.extra.endTime * 60) { endDive(); return; }
    } else if (dive.surfacedAt != null) dive.surfacedAt = null;

    // Sicherheitsstopp (Kap. 9.1)
    const sf = dive.safety;
    const setting = m.algo.safety;
    if (m.algo.enabled && setting !== 'off' && dive.maxDepth > 10 && !sf.required) {
      sf.required = true; sf.started = false; sf.done = false;
      sf.total = setting === 'adjusted' ? 180 : parseInt(setting, 10) * 60;
      sf.remaining = sf.total;
    }
    if (sf.done && d > 10) { // erneut tief -> neuer Sicherheitsstopp (Annahme)
      sf.required = false; sf.done = false;
    }
    if (live.inDeco && d <= 6) sf.shallowDeco += dt;
    if (sf.required && !sf.done && !live.inDeco && dive.surfacedAt == null) {
      if (setting === 'adjusted' && dive.everDeco && !sf.adjustedApplied) {
        sf.adjustedApplied = true;
        sf.remaining = Math.max(0, 180 - sf.shallowDeco * 0.5); // Annahme, siehe UNKLAR.md
      }
      if (d >= 2.4 && d <= 6) { sf.started = true; sf.remaining -= dt; }
      if (sf.remaining <= 0) { sf.remaining = 0; sf.done = true; }
    }

    // Aufstiegsgeschwindigkeit > 10 m/min für >= 5 s
    if (live.ascRate > 10) { if (live.ascFastSince == null) live.ascFastSince = dive.runtime; }
    else live.ascFastSince = null;

    // Dekostufe verletzt
    if (live.above === 'broken') {
      if (dive.brokenSince == null) dive.brokenSince = dive.runtime;
      if (dive.runtime - dive.brokenSince >= 180 && !dive.deviation) {
        dive.deviation = true;
        S.deviationUntil = S.now() + 48 * 3600 * 1000;
      }
    } else dive.brokenSince = null;
  }

  /** Dekompressionswerte – einmal pro Tick */
  function calcDeco() {
    const m = modeNow();
    const gfv = S.gf(m);
    const lo = gfv.lo / 100, hi = gfv.hi / 100;
    const env = algoEnv();
    const ps = S.algoSurf(m);
    const off = ps != null ? env.psurf - ps : 0;
    const t = S.tissues;
    const d = live.depth;
    const gas = dive ? S.activeGas(m) : S.activeGas(m);
    live.gf99 = t.gfNow(live.pamb);
    live.surfGF = t.gfNow(ps != null ? ps : env.psurf);
    if (!m.algo.enabled) {
      live.ndl = null; live.inDeco = false; live.tts = 0; live.ceiling = 0; live.above = 'none'; live.inWindow = false;
      return;
    }
    const anchorNow = Math.max(0, D.dAt(t.tolerated(lo) + off, env));
    if (dive) dive.anchor = Math.max(dive.anchor, anchorNow);
    const anchor = dive ? dive.anchor : anchorNow;
    live.ceiling = D.ceiling(t, env, anchor, lo, hi, ps);
    live.ndl = D.ndl(t, env, Math.max(d, 0), gas, hi, ps);
    const wasDeco = live.inDeco;
    const sf = dive ? dive.safety : null;
    const popts = {
      env, gases: S.usableGases(m), gas, gfLow: lo, gfHigh: hi, anchor, lastStop: m.algo.lastStop, rate: 10,
      safety: sf && sf.required && !sf.done ? { mode: m.algo.safety, remaining: sf.remaining } : null, algoSurf: ps,
    };
    const pl = D.plan(t, d, popts);
    live.plan = pl;
    live.tts = pl.tts;
    // Deko = Nullzeit 0 und mindestens ein Stopp im Aufstiegsplan
    live.inDeco = live.ndl === 0 && pl.stops.length > 0;
    if (dive && live.inDeco) dive.everDeco = true;
    if (live.inDeco) {
      const first = pl.stops[0];
      live.stopDepth = first ? first.depth : m.algo.lastStop;
      live.stopTime = first ? first.time : 0;
      // Dekostufe: Gestuft = Tiefe des nächsten Stopps; Durchgehend = Ceiling (Kap. 8.3)
      const profile = m.algo.profile;
      live.deko = profile === 'stepped' ? live.stopDepth : Math.max(live.ceiling, 0);
      if (profile !== 'stepped' && live.deko < 3 && live.ceiling > 0) live.deko = Math.max(live.deko, 0); // letzte Dekostufe 3 m
      live.inWindow = d >= live.deko - 0.0001 && d <= live.deko + 3;
      if (d < live.deko - 0.6) live.above = 'broken';
      else if (d < live.deko) live.above = 'reserve';
      else live.above = 'none';
    } else {
      live.deko = 0; live.inWindow = false; live.above = 'none';
    }
    if (dive && !wasDeco && live.inDeco) dive.decoEnteredAlarm = true;
    // Kontingenz Δ+5 / @5
    const c = t.clone();
    c.load(live.pamb, 0, 5, gas);
    const p5 = D.plan(c, d, Object.assign({}, popts, { anchor: Math.max(anchor, D.dAt(c.tolerated(lo) + off, env)) }));
    live.at5 = p5.tts;
    live.delta5 = p5.tts - pl.tts;
    // AMV und Gaszeit
    calcGas(gas);
    // Gaswechselvorschlag (Kap. 5.2)
    if (dive && S.settings.diveMode === 'multi') {
      const best = D.bestGas(S.usableGases(m), d);
      if (best && best.o2 > gas.o2 && best.id !== gas.id) {
        if (dive.dismissed !== best.id) dive.suggest = best; else dive.suggest = null;
      } else { dive.suggest = null; if (dive.dismissed && (!best || best.id !== dive.dismissed)) dive.dismissed = null; }
    }
  }

  function calcGas(gas) {
    live.rmv = null; live.gasTime = null;
    if (!dive) return;
    const ss = dive.gasSamples.filter((s) => s.gas === gas.id);
    if (ss.length >= 2) {
      const a = ss[0], b = ss[ss.length - 1];
      const dtm = (b.t - a.t) / 60;
      if (b.t - a.t >= 50) {
        const davg = ss.reduce((x, s) => x + s.d, 0) / ss.length;
        const rmv = -(b.V - a.V) / dtm / (1 + 0.1 * davg);
        if (rmv > 0) {
          live.rmv = rmv;
          const u = dive.gasUse[gas.id];
          if (u) u.rmv.push(rmv);
        }
      }
    }
    const pods = podsFor(gas).filter((p) => p.data);
    if (live.rmv && pods.length) {
      const d = live.depth;
      const tc = 293.15 / (273.15 + live.temp);
      const V = pods.reduce((x, p) => x + gas.tank * p.pressure / 1.01325 * tc, 0);
      const Vres = pods.length * gas.tank * 35 / 1.01325;
      const ascent = live.rmv * (1 + 0.1 * d / 2) * (d / 10);
      const tmin = (V - Vres - ascent) / (live.rmv * (1 + 0.1 * d));
      live.gasTime = Math.max(0, tmin);
    }
  }

  function tick(realDt) {
    const scale = S.env.timeScale || 1;
    let simDt = realDt * scale;
    S.simOffset += simDt * 1000 - realDt * 1000;
    while (simDt > 0) {
      const dt = Math.min(1, simDt);
      step(dt);
      simDt -= dt;
    }
    calcDeco();
  }

  /** Oberflächenintervall vorspulen (z. B. nach dem Laden der Seite) */
  function fastForward(sec) {
    if (sec <= 0) return;
    S.tissues.load(S.env.psurf, 0, sec / 60, { o2: 21, he: 0 });
    S.cns *= Math.pow(0.5, sec / 5400);
  }

  function setDepthNow(dm) { S.env.depth = dm; S.env.targetDepth = dm; prevDepth = dispDepth(S.env.psurf + dm * S.env.rho * 9.80665e-5); }

  SN.sim = {
    live, tick, fastForward, podsFor, dailyOTU, totalCNS, noFlyRemaining, desatTime, setDepthNow,
    get dive() { return dive; },
    dismissSuggestion() { if (dive && dive.suggest) { dive.dismissed = dive.suggest.id; dive.suggest = null; } },
    switchGas(g) {
      const m = modeNow();
      m.gases.forEach((x) => { if (x.state === 'active') x.state = 'enabled'; });
      g.state = 'active';
      if (dive) { dive.suggest = null; if (!dive.gasesUsed.includes(g.id)) dive.gasesUsed.push(g.id); if (!dive.gasUse[g.id]) dive.gasUse[g.id] = { start: podsFor(g).map((p) => p.data ? p.pressure : null), rmv: [] }; dive.gasSamples = []; }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
