/* Tauchalarme (Kap. 7): obligatorische + benutzerkonfigurierbare, Töne, Vibration */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});
  const S = SN.state;
  const L = () => SN.sim.live;

  // level: warning (rot), caution (gelb), notify (cyan)
  // Priorität: Reihenfolge der Liste (Warnungen zuerst)
  function mandatory() {
    const l = L(), dv = SN.sim.dive, m = S.mode();
    if (!dv) return [];
    const gas = S.activeGas(m);
    const pods = SN.sim.podsFor(gas).filter((p) => p.data);
    const minP = pods.length ? Math.min(...pods.map((p) => p.pressure)) : null;
    const out = [];
    const push = (id, level, cond, extra) => { if (cond) out.push(Object.assign({ id, level }, extra || {})); };
    // Kap. 9.2: rote Warnung bleibt, bis die Dekostopps durchgeführt wurden
    push('deviation', 'warning', dv.deviation && l.inDeco, { takeover: 'deviation' });
    push('ascent', 'warning', l.ascFastSince != null && dv.runtime - l.ascFastSince >= 5, { field: 'asc' });
    push('ceiling', 'warning', l.above === 'broken', { field: 'stop' });
    push('ppo2max', 'warning', l.ppo2 > 1.6, { field: 'ppo2' });
    push('cns100', 'warning', S.cns >= 100, { field: 'cns' });
    push('otu300', 'warning', SN.sim.dailyOTU() >= 300, { field: 'otu' });
    push('tank50', 'warning', minP != null && minP < 50, { takeover: 'tank', field: 'tank' });
    push('ppo2set', 'caution', l.ppo2 > gas.ppo2 && l.ppo2 <= 1.6, { field: 'ppo2' });
    push('cns80', 'caution', S.cns >= 80 && S.cns < 100, { field: 'cns' });
    push('otu250', 'caution', SN.sim.dailyOTU() >= 250 && SN.sim.dailyOTU() < 300, { field: 'otu' });
    push('safetywin', 'caution', dv.safety.started && !dv.safety.done && l.depth < 2.4 && dv.surfacedAt == null, { field: 'stop' });
    push('ndl5', 'caution', m.algo.enabled && l.ndl != null && l.ndl > 0 && l.ndl <= 5, { field: 'deco' });
    push('deco', 'caution', m.algo.enabled && l.inDeco, { field: 'deco', ackOnly: true });
    push('gasswitch', 'notify', !!dv.suggest, { takeover: 'gasswitch' });
    return out;
  }

  // Benutzeralarme: lösen einmalig aus, wenn die Schwelle erreicht wird
  function user() {
    const l = L(), dv = SN.sim.dive, m = S.mode();
    if (!dv) return [];
    const a = m.alarms;
    const gas = S.activeGas(m);
    const pods = SN.sim.podsFor(gas).filter((p) => p.data);
    const out = [];
    a.depth.forEach((x, i) => { if (x.on !== false && l.depth >= x.v) out.push({ id: 'u-depth-' + i, level: x.look, field: 'depth', cfg: x, user: true }); });
    a.time.forEach((x, i) => { if (x.on !== false && dv.runtime >= x.v) out.push({ id: 'u-time-' + i, level: x.look, field: 'time', cfg: x, user: true }); });
    a.ndl.forEach((x, i) => { if (x.on !== false && l.ndl != null && l.ndl > 0 && l.ndl <= x.v) out.push({ id: 'u-ndl-' + i, level: x.look, field: 'deco', cfg: x, user: true }); });
    if (pods.length) {
      const minP = Math.min(...pods.map((p) => p.pressure));
      a.tank.forEach((x, i) => { if (x.on !== false && minP <= x.v) out.push({ id: 'u-tank-' + i, level: x.look, takeover: 'tank', cfg: x, user: true }); });
      if (pods.length > 1) {
        const diff = Math.abs(pods[0].pressure - pods[1].pressure);
        a.sidemount.forEach((x, i) => { if (x.on !== false && diff >= x.v) out.push({ id: 'u-side-' + i, level: x.look, takeover: 'sidemount', cfg: x, user: true }); });
      }
    }
    if (l.gasTime != null) a.gastime.forEach((x, i) => { if (x.on !== false && l.gasTime <= x.v) out.push({ id: 'u-gastime-' + i, level: x.look, takeover: 'gastime', cfg: x, user: true }); });
    return out;
  }

  const active = new Map(); // id -> {def, acked, since}
  const fired = new Set();  // Benutzeralarme, die bereits ausgelöst haben
  let audioCtx = null;
  let lastBeep = 0;

  function beep(pattern) {
    const m = S.mode();
    if (m.alarms.muteAudio) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      let t = audioCtx.currentTime;
      for (const [dur, gap, f] of pattern) {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'square'; o.frequency.value = f || 3100;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
        g.gain.setValueAtTime(0.08, t + dur - 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + dur + 0.02);
        t += dur + gap;
      }
    } catch (e) { /* kein Audio */ }
  }
  function vibrate(ms) {
    const m = S.mode();
    if (m.alarms.muteVib) return;
    if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* */ }
    if (SN.app) SN.app.shake();
  }

  function signal(def) {
    const cfg = def.cfg;
    if (cfg) {
      if (cfg.audio !== false) beep(cfg.tone === 'long' ? [[0.6, 0.1, 2900]] : [[0.12, 0.08, 3100], [0.12, 0, 3100]]);
      if (cfg.vib !== false) vibrate(cfg.tone === 'long' ? 600 : 250);
      return;
    }
    if (def.level === 'warning') { beep([[0.15, 0.06], [0.15, 0.06], [0.15, 0.06], [0.4, 0]]); vibrate([200, 80, 200, 80, 400]); }
    else if (def.level === 'caution') { beep([[0.2, 0.1], [0.2, 0]]); vibrate([200, 100, 200]); }
    else { beep([[0.15, 0]]); vibrate(150); }
  }

  function update() {
    const defs = mandatory().concat(user());
    const ids = new Set(defs.map((d) => d.id));
    for (const def of defs) {
      if (def.user && fired.has(def.id) && !active.has(def.id)) continue;
      if (!active.has(def.id)) {
        active.set(def.id, { def, acked: false, since: Date.now() });
        if (def.user) fired.add(def.id);
        signal(def);
        if (SN.app) SN.app.wake();
      } else active.get(def.id).def = def;
    }
    for (const [id, a] of active) {
      if (!ids.has(id)) {
        // Benutzeralarme bleiben bis zur Quittierung sichtbar; obligatorische verschwinden bei Auflösung
        if (a.def.user && !a.acked) continue;
        active.delete(id);
      }
    }
    // Benutzeralarme dürfen erneut auslösen, wenn Bedingung zurückgesetzt ist
    for (const id of Array.from(fired)) if (!ids.has(id) && !active.has(id)) fired.delete(id);
    // Warnungen wiederholen den Ton bis zur Quittierung
    const w = pending().find((a) => a.def.level === 'warning');
    if (w && Date.now() - lastBeep > 3000) { lastBeep = Date.now(); if (Date.now() - w.since > 1000) beep([[0.15, 0.06], [0.15, 0]]); }
    if (!SN.sim.dive && active.size) { active.clear(); fired.clear(); }
  }

  function order(a, b) {
    const p = { warning: 0, caution: 1, notify: 2 };
    return p[a.def.level] - p[b.def.level];
  }
  function pending() { return Array.from(active.values()).filter((a) => !a.acked).sort(order); }

  /** Tastendruck quittiert den Alarm mit höchster Priorität (Kap. 7.1). true = verbraucht */
  function ack() {
    const p = pending();
    if (!p.length) return false;
    const a = p[0];
    a.acked = true;
    if (a.def.user) active.delete(a.def.id);
    return a.def;
  }

  /** Feldhervorhebung: Warnungen bis Auflösung; Vorsicht/Benachr. (Benutzer) bis Quittierung */
  function fieldLevel(field) {
    let best = null;
    for (const a of active.values()) {
      if (a.def.field !== field) continue;
      if (a.def.ackOnly) continue;
      if (a.def.user && a.acked) continue;
      if (!best || order(a, best) < 0) best = a;
    }
    return best ? best.def.level : null;
  }
  function takeover() {
    const p = pending().filter((a) => a.def.takeover);
    if (p.length) return p[0].def;
    // Gaswechsel-Hinweis bleibt im Fenster, bis gewechselt/verworfen
    const dv = active.get('deviation');
    if (dv) return dv.def;
    const g = active.get('gasswitch');
    if (g) return g.def;
    return null;
  }

  SN.alarms = { update, ack, pending, fieldLevel, takeover, active, beep, clear() { active.clear(); fired.clear(); } };
})(typeof window !== 'undefined' ? window : globalThis);
