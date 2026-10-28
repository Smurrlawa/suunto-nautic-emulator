/*
 * Bühlmann ZHL-16C mit Gradientenfaktoren, CNS/OTU.
 * Handbuch Kap. 8: "Suunto Bühlmann 16 GF basierend auf ZHL-16C".
 * Die Suunto-eigene Implementierung ist nicht öffentlich – dies ist eine
 * Standard-Implementierung (Schreiner-Gleichung, GF-Interpolation nach Baker).
 */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});

  const PH2O = 0.0627; // Wasserdampfdruck in der Lunge (bar)
  const LN2 = Math.LN2;

  // ZHL-16C (Kompartiment 1 = "1b", 5 min)
  const N2_HT = [5.0, 8.0, 12.5, 18.5, 27.0, 38.3, 54.3, 77.0, 109, 146, 187, 239, 305, 390, 498, 635];
  const N2_A = [1.1696, 1.0, 0.8618, 0.7562, 0.62, 0.5043, 0.441, 0.4, 0.375, 0.35, 0.3295, 0.3065, 0.2835, 0.261, 0.248, 0.2327];
  const N2_B = [0.5578, 0.6514, 0.7222, 0.7825, 0.8126, 0.8434, 0.8693, 0.891, 0.9092, 0.9222, 0.9319, 0.9403, 0.9477, 0.9544, 0.9602, 0.9653];
  const HE_HT = [1.88, 3.02, 4.72, 6.99, 10.21, 14.48, 20.53, 29.11, 41.2, 55.19, 70.69, 90.34, 115.29, 147.42, 188.24, 240.03];
  const HE_A = [1.6189, 1.383, 1.1919, 1.0458, 0.922, 0.8205, 0.7305, 0.6502, 0.595, 0.5545, 0.5333, 0.5189, 0.5181, 0.5176, 0.5172, 0.5119];
  const HE_B = [0.477, 0.5747, 0.6527, 0.7223, 0.7582, 0.7957, 0.8279, 0.8553, 0.8757, 0.8903, 0.8997, 0.9073, 0.9122, 0.9171, 0.9217, 0.9267];
  const N = 16;

  class Tissues {
    constructor(src) {
      this.n2 = new Array(N);
      this.he = new Array(N);
      if (src) {
        for (let i = 0; i < N; i++) { this.n2[i] = src.n2[i]; this.he[i] = src.he[i]; }
      } else this.reset(1.01325);
    }
    reset(psurf) {
      for (let i = 0; i < N; i++) { this.n2[i] = (psurf - PH2O) * 0.7902; this.he[i] = 0; }
    }
    clone() { return new Tissues(this); }
    toJSON() { return { n2: this.n2.slice(), he: this.he.slice() }; }

    /**
     * Schreiner-Gleichung. p0: Umgebungsdruck am Anfang (bar), rate: bar/min,
     * tMin: Dauer in Minuten, gas: {o2, he} in Prozent.
     */
    load(p0, rate, tMin, gas) {
      if (tMin <= 0) return;
      const fHe = gas.he / 100;
      const fN2 = 1 - gas.o2 / 100 - fHe;
      const piN2 = Math.max(0, p0 - PH2O) * fN2, rN2 = rate * fN2;
      const piHe = Math.max(0, p0 - PH2O) * fHe, rHe = rate * fHe;
      for (let i = 0; i < N; i++) {
        let k = LN2 / N2_HT[i];
        this.n2[i] = piN2 + rN2 * (tMin - 1 / k) - (piN2 - this.n2[i] - rN2 / k) * Math.exp(-k * tMin);
        k = LN2 / HE_HT[i];
        this.he[i] = piHe + rHe * (tMin - 1 / k) - (piHe - this.he[i] - rHe / k) * Math.exp(-k * tMin);
      }
    }

    /** tolerierter Umgebungsdruck je Kompartiment für einen GF (0..1) */
    tolerated(gf) {
      let max = 0;
      for (let i = 0; i < N; i++) {
        const p = this.n2[i] + this.he[i];
        const a = (N2_A[i] * this.n2[i] + HE_A[i] * this.he[i]) / p;
        const b = (N2_B[i] * this.n2[i] + HE_B[i] * this.he[i]) / p;
        const tol = (p - a * gf) / (gf / b + 1 - gf);
        if (tol > max) max = tol;
      }
      return max;
    }

    /** M-Wert (GF 100) für ein Kompartiment bei Umgebungsdruck pamb */
    mValue(i, pamb) {
      const p = this.n2[i] + this.he[i];
      const a = p > 0 ? (N2_A[i] * this.n2[i] + HE_A[i] * this.he[i]) / p : N2_A[i];
      const b = p > 0 ? (N2_B[i] * this.n2[i] + HE_B[i] * this.he[i]) / p : N2_B[i];
      return a + pamb / b;
    }

    /** aktueller Gradientfaktor (GF99) in % bei pamb */
    gfNow(pamb) {
      let max = -Infinity;
      for (let i = 0; i < N; i++) {
        const p = this.n2[i] + this.he[i];
        const m = this.mValue(i, pamb);
        const gf = (p - pamb) / (m - pamb);
        if (gf > max) max = gf;
      }
      return max * 100;
    }

    /** Daten für Gewebediagramm: Anteil Gewebedruck/Umgebungsdruck, M-Wert-Überschreitung */
    chart(pamb) {
      const out = [];
      for (let i = 0; i < N; i++) {
        const p = this.n2[i] + this.he[i];
        out.push({ ratio: p / pamb, overM: p > this.mValue(i, pamb), overAmb: p > pamb });
      }
      return out;
    }
  }

  /**
   * Umrechnung Tiefe <-> Druck. env = {psurf (bar), rho (kg/m³)}
   */
  function pAt(depth, env) { return env.psurf + Math.max(0, depth) * env.rho * 9.80665e-5; }
  function dAt(p, env) { return (p - env.psurf) / (env.rho * 9.80665e-5); }

  function gfAt(depth, anchor, gfLow, gfHigh) {
    if (anchor <= 0) return gfHigh;
    if (depth >= anchor) return gfLow;
    return gfHigh + (gfLow - gfHigh) * depth / anchor;
  }

  /** Ceiling-Tiefe (m) mit GF-Interpolation; 0 wenn keine */
  function ceiling(t, env, anchor, gfLow, gfHigh, algoSurf) {
    const ps = algoSurf != null ? algoSurf : env.psurf;
    const tolHigh = t.tolerated(gfHigh);
    if (tolHigh <= ps) return 0;
    // von flach nach tief suchen: erste Tiefe, an der Gewebe toleriert werden
    const maxD = Math.max(anchor, dAt(t.tolerated(gfLow), env)) + 1;
    for (let d = 0; d <= maxD; d += 0.1) {
      const gf = gfAt(d, anchor, gfLow, gfHigh);
      if (t.tolerated(gf) <= pAt(d, env) - (env.psurf - ps)) return Math.round(d * 10) / 10;
    }
    return Math.round(maxD * 10) / 10;
  }

  // MOD wie in den Screenshots: AIR/1.4 => 56.7 m, NX32/1.4 => 33.8 m, NX50/1.6 => 22 m
  function mod(gas) {
    return (gas.ppo2 / (gas.o2 / 100) - 1) * 10;
  }

  /** bestes Gas für eine Tiefe (höchster O2-Anteil innerhalb der MOD) */
  function bestGas(gases, depth) {
    let best = null;
    for (const g of gases) {
      if (mod(g) + 0.05 >= depth && (!best || g.o2 > best.o2)) best = g;
    }
    return best;
  }

  /** Nullzeit in Minuten (max 100 => ">99"). 0 => Deko */
  function ndl(t, env, depth, gas, gfHigh, algoSurf) {
    const ps = algoSurf != null ? algoSurf : env.psurf;
    if (t.tolerated(gfHigh) > ps) return 0;
    const c = t.clone();
    const p = pAt(depth, env);
    for (let m = 1; m <= 100; m++) {
      c.load(p, 0, 1, gas);
      if (c.tolerated(gfHigh) > ps) return m - 1;
    }
    return 100;
  }

  /**
   * Aufstiegsplan ab aktueller Tiefe.
   * opts: {env, gases (verfügbar), gas (aktiv), gfLow, gfHigh, anchor, lastStop (3|6),
   *        stepped (bool), rate (m/min, 10), safety: {mode, remaining (s)} , algoSurf}
   * Ergebnis: {tts (min), stops:[{depth, time (min), gas}], anchor, firstStop}
   */
  function plan(t0, depth, opts) {
    const env = opts.env;
    const rate = opts.rate || 10;
    const gfL = opts.gfLow, gfH = opts.gfHigh;
    const t = t0.clone();
    const ps = opts.algoSurf != null ? opts.algoSurf : env.psurf;
    const off = env.psurf - ps;
    let gas = opts.gas;
    const multi = opts.gases && opts.gases.length > 1;
    let anchor = Math.max(opts.anchor || 0, dAt(t.tolerated(gfL) + off, env));
    const segments = [];
    let time = 0;
    let d = depth;

    const ascend = (to) => {
      while (d > to + 1e-6) {
        // in 3-m-Abschnitten aufsteigen, um Gaswechsel zu erkennen
        const next = Math.max(to, Math.ceil(d / 3 - 1e-6) * 3 - 3);
        const tgt = Math.max(to, next);
        const dt = (d - tgt) / rate;
        const p0 = pAt(d, env), p1 = pAt(tgt, env);
        t.load(p0, (p1 - p0) / dt, dt, gas);
        time += dt;
        d = tgt;
        if (multi) {
          const bg = bestGas(opts.gases, d);
          if (bg && bg.o2 > gas.o2) { gas = bg; segments.push({ type: 'switch', depth: d, gas, run: time }); }
        }
      }
    };

    const tol = (gf) => t.tolerated(gf);
    let stops = [];
    if (tol(gfH) > ps) {
      // Deko erforderlich
      let firstStop = Math.max(opts.lastStop, Math.ceil(anchor / 3 - 1e-6) * 3);
      if (firstStop > d) firstStop = Math.max(opts.lastStop, Math.floor(d / 3) * 3);
      let stop = firstStop;
      if (d > stop) ascend(stop);
      let guard = 0;
      while (stop > 0 && guard++ < 2000) {
        const next = stop <= opts.lastStop ? 0 : stop - 3;
        const gfN = gfAt(next, anchor, gfL, gfH);
        let st = 0;
        const p = pAt(stop, env);
        while (tol(gfN) > pAt(next, env) - off && st < 999) {
          t.load(p, 0, 1 / 6, gas); st += 1 / 6; time += 1 / 6;
        }
        if (st > 0) stops.push({ depth: stop, time: st, gas, run: time });
        if (next === 0) break;
        ascend(next);
        stop = next;
      }
      d = Math.min(d, stop);
    }
    // Sicherheitsstopp im TTS nur bei "Eingestellt"
    let safetyAdd = 0;
    if (opts.safety && opts.safety.mode === 'adjusted' && opts.safety.remaining > 0) {
      safetyAdd = opts.safety.remaining / 60;
    }
    ascend(0);
    time += safetyAdd;
    return { tts: time, stops, anchor, segments };
  }

  // NOAA CNS-Grenzwerte (Minuten) je ppO2
  const CNS_TAB = [[0.6, 720], [0.7, 570], [0.8, 450], [0.9, 360], [1.0, 300], [1.1, 240], [1.2, 210], [1.3, 180], [1.4, 150], [1.5, 120], [1.6, 45]];
  function cnsPerMin(ppo2) {
    if (ppo2 < 0.5) return 0;
    const p = Math.min(ppo2, 1.6); // Handbuch: "CNS% ist auf 1,6 bar begrenzt"
    if (p <= 0.6) return 100 / 720;
    for (let i = 1; i < CNS_TAB.length; i++) {
      if (p <= CNS_TAB[i][0]) {
        const [p0, l0] = CNS_TAB[i - 1], [p1, l1] = CNS_TAB[i];
        const lim = l0 + (l1 - l0) * (p - p0) / (p1 - p0);
        return 100 / lim;
      }
    }
    return 100 / 45;
  }
  function otuPerMin(ppo2) {
    if (ppo2 <= 0.5) return 0;
    return Math.pow((ppo2 - 0.5) / 0.5, 0.83);
  }

  SN.Deco = { Tissues, PH2O, pAt, dAt, gfAt, ceiling, ndl, plan, mod, bestGas, cnsPerMin, otuPerMin, N };
})(typeof window !== 'undefined' ? window : globalThis);
