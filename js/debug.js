/* Debug-Menü: Umgebungsparameter, Sensoren, Zeitraffer, Szenarien */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});
  const S = SN.state;
  const $ = (s, r) => (r || document).querySelector(s);

  let root;
  const binds = []; // {el, get, set, fmt}

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'on') for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]);
      else if (k === 'cls') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of kids) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  function section(title, open, ...kids) {
    const d = h('details', open ? { open: '' } : {}, h('summary', {}, title), ...kids);
    return d;
  }
  function slider(label, min, max, step, get, set, unit) {
    const out = h('span', { cls: 'val' });
    const inp = h('input', { type: 'range', min, max, step });
    inp.addEventListener('input', () => { set(parseFloat(inp.value)); });
    binds.push({ el: inp, get, out, unit, step });
    return h('label', { cls: 'row' }, h('span', { cls: 'lbl' }, label), inp, out);
  }
  function numIn(label, step, get, set, unit) {
    const inp = h('input', { type: 'number', step });
    inp.addEventListener('change', () => set(parseFloat(inp.value)));
    binds.push({ el: inp, get, isNum: true });
    return h('label', { cls: 'row' }, h('span', { cls: 'lbl' }, label), inp, h('span', { cls: 'val' }, unit || ''));
  }
  function check(label, get, set) {
    const inp = h('input', { type: 'checkbox' });
    inp.addEventListener('change', () => set(inp.checked));
    binds.push({ el: inp, get, isCheck: true });
    return h('label', { cls: 'row cb' }, inp, h('span', {}, label));
  }
  function select(label, opts, get, set) {
    const sel = h('select', {}, ...opts.map(([v, l]) => h('option', { value: v }, l)));
    sel.addEventListener('change', () => set(sel.value));
    binds.push({ el: sel, get, isSel: true });
    return h('label', { cls: 'row' }, h('span', { cls: 'lbl' }, label), sel);
  }
  function btn(label, fn, cls) { return h('button', { cls: cls || '', on: { click: fn } }, label); }
  function btns(...b) { return h('div', { cls: 'btns' }, ...b); }

  // ---------------- Szenarien ----------------
  const scen = { steps: null, i: 0, t0: 0, name: '' };
  function runScenario(sc) {
    stopScenario();
    if (S.settings.setupDone === false) { S.settings.setupDone = true; }
    if (SN.app.power !== 'on') { SN.app.power = 'on'; SN.ui.nav.stack = [SN.face.Face]; }
    SN.app.lastInput = S.now(); SN.app.wake();
    sc.setup && sc.setup();
    S.save();
    scen.steps = sc.steps.map((x) => Object.assign({}, x)); scen.i = 0; scen.t0 = S.now(); scen.name = sc.name;
    S.env.timeScale = sc.scale || 10;
  }
  function stopScenario() { scen.steps = null; S.env.targetDepth = S.env.depth; }
  function scenTick() {
    if (!scen.steps) return;
    const st = scen.steps[scen.i];
    if (!st) { scen.steps = null; scen.name += ' ✓'; return; }
    const env = S.env, l = SN.sim.live, dv = SN.sim.dive;
    let done = false;
    if (st.act) { st.act(); done = true; }
    else if (st.to != null) {
      env.rate = st.rate || 10; env.targetDepth = st.to;
      done = Math.abs(env.depth - st.to) < 0.01;
    } else if (st.hold != null) {
      if (!st._t) st._t = S.now();
      done = (S.now() - st._t) / 1000 >= st.hold;
    } else if (st.until) {
      done = st.until(l, dv);
    } else if (st.followDeco) {
      // Autopilot: knapp (0,6 m) unter der Dekostufe bleiben, bis keine Deko mehr nötig ist
      env.rate = 9;
      env.targetDepth = l.inDeco ? Math.max(l.deko, 3) + 0.6 : st.followDeco;
      done = !l.inDeco && Math.abs(env.depth - st.followDeco) < 0.05;
    }
    if (done) { delete st._t; scen.i++; }
  }

  function setGases(mode, list) {
    S.settings.diveMode = mode;
    const m = S.mode();
    m.gases = list.map((g, i) => Object.assign(S.newGas(g.o2, g.he || 0, g.ppo2 || 1.4, i === 0 ? 'active' : mode === 'multi' ? 'enabled' : 'disabled'), g.pods ? { pods: g.pods } : {}, g.tank ? { tank: g.tank } : {}));
  }
  function resetEnv() {
    const e = S.env;
    e.psurf = 1.01325; e.rho = 1025; e.wetMode = 'auto'; e.tempWater = 22; e.sac = 15; e.breatheFrom = 0;
    e.pods[0].pressure = 210; e.pods[1].pressure = 205;
    e.pods.forEach((p) => { p.inRange = true; p.active = true; p.battery = 'ok'; });
    SN.sim.setDepthNow(0);
  }
  const POD1 = ['1234567890', null];
  const SCENARIOS = [
    { name: 'Freizeit-TG 18 m / 40 min (Luft, Tank POD)', desc: 'Normaler Nullzeit-Tauchgang mit Sicherheitsstopp.',
      setup() { resetEnv(); setGases('single', [{ o2: 21, pods: POD1.slice() }]); },
      steps: [{ to: 18, rate: 15 }, { hold: 33 * 60 }, { to: 5, rate: 9 }, { until: (l, d) => d && d.safety.done }, { hold: 20 }, { to: 0, rate: 6 }] },
    { name: 'Nullzeit-Warnung (30 m)', desc: 'Bleibt auf 30 m, bis NDL ≤ 5 min (gelber Alarm), dann Aufstieg.',
      setup() { resetEnv(); setGases('single', [{ o2: 21, pods: POD1.slice() }]); },
      steps: [{ to: 30, rate: 18 }, { until: (l) => l.ndl != null && l.ndl <= 4 }, { hold: 30 }, { to: 5, rate: 9 }, { until: (l, d) => d && d.safety.done }, { to: 0, rate: 6 }] },
    { name: 'Dekotauchgang 40 m (Luft)', desc: '40 m für 22 min, dann Deko-Autopilot knapp unter der Dekostufe.',
      setup() { resetEnv(); setGases('single', [{ o2: 21, tank: 15, pods: POD1.slice() }]); },
      steps: [{ to: 40, rate: 18 }, { hold: 20 * 60 }, { followDeco: 5 }, { until: (l, d) => d && (d.safety.done || !d.safety.required) }, { to: 0, rate: 6 }] },
    { name: 'Multigas 40 m NX28 + NX99', desc: 'Wie Handbuch-Beispiel 9.6. Gaswechsel bei 6 m vorschlagen → Taste drücken, OK bestätigt.',
      setup() { resetEnv(); setGases('multi', [{ o2: 28, ppo2: 1.4, tank: 15, pods: POD1.slice() }, { o2: 99, ppo2: 1.6 }]); S.mode().algo.safety = 'adjusted'; },
      steps: [{ to: 40, rate: 18 }, { hold: 20 * 60 }, { followDeco: 5 }, { until: (l, d) => d && (d.safety.done || !d.safety.required) }, { to: 0, rate: 6 }] },
    { name: 'Zu schneller Aufstieg', desc: '25 m, dann Aufstieg mit 18 m/min (roter Aufstiegsbalken).',
      setup() { resetEnv(); setGases('single', [{ o2: 21, pods: POD1.slice() }]); },
      steps: [{ to: 25, rate: 18 }, { hold: 5 * 60 }, { to: 6, rate: 18 }, { hold: 3 * 60 }, { to: 0, rate: 6 }], scale: 5 },
    { name: 'Dekostufe verletzt → Algorithmusabweichung', desc: 'Deko auf 40 m, dann direkt auf 2 m und dort 4 min bleiben.',
      setup() { resetEnv(); setGases('single', [{ o2: 21, tank: 15, pods: POD1.slice() }]); },
      steps: [{ to: 40, rate: 18 }, { hold: 20 * 60 }, { to: 2, rate: 10 }, { hold: 4 * 60 }, { followDeco: 5 }, { to: 0, rate: 6 }] },
    { name: 'Niedriger Flaschendruck (< 50 bar)', desc: 'Start mit 90 bar, AMV 40 l/min auf 20 m.',
      setup() { resetEnv(); setGases('single', [{ o2: 21, pods: POD1.slice() }]); S.env.pods[0].pressure = 90; S.env.sac = 40; S.mode().alarms.tank = [{ v: 70, look: 'notify', tone: 'short', audio: true, vib: true, on: true }]; },
      steps: [{ to: 20, rate: 18 }, { until: () => S.env.pods[0].pressure < 45 }, { to: 5, rate: 9 }, { hold: 60 }, { to: 0, rate: 6 }] },
    { name: 'ppO₂ zu hoch (NX32 auf 40 m)', desc: 'ppO₂ über 1,4 (gelb) und über 1,6 (rot).',
      setup() { resetEnv(); setGases('single', [{ o2: 32, ppo2: 1.4, pods: POD1.slice() }]); },
      steps: [{ to: 36, rate: 18 }, { hold: 60 }, { to: 42, rate: 6 }, { hold: 60 }, { to: 20, rate: 9 }, { hold: 60 }, { to: 0, rate: 9 }], scale: 5 },
    { name: 'Sicherheitsstopp-Fenster verlassen', desc: 'Sicherheitsstopp beginnt, dann Aufstieg auf 1,8 m und zurück.',
      setup() { resetEnv(); setGases('single', [{ o2: 21, pods: POD1.slice() }]); },
      steps: [{ to: 20, rate: 18 }, { hold: 15 * 60 }, { to: 5, rate: 9 }, { hold: 60 }, { to: 1.8, rate: 5 }, { hold: 30 }, { to: 4.5, rate: 5 }, { until: (l, d) => d && d.safety.done }, { to: 0, rate: 6 }], scale: 5 },
    { name: 'Sidemount (2 Tank PODs)', desc: 'Zwei PODs auf Luft, Sidemount-Alarm bei 20 bar Differenz.',
      setup() { resetEnv(); setGases('single', [{ o2: 21, pods: ['1234567890', '5678901234'] }]); S.mode().alarms.sidemount = [{ v: 20, look: 'notify', tone: 'short', audio: true, vib: true, on: true }]; S.env.breatheFrom = 0; S.env.sac = 22; },
      steps: [{ to: 18, rate: 15 }, { hold: 20 * 60 }, { to: 5, rate: 9 }, { until: (l, d) => d && d.safety.done }, { to: 0, rate: 6 }] },
    { name: 'Bergsee 1800 m (Süßwasser, 0,81 bar)', desc: 'Luftdruck 0,81 bar, Süßwasser. Höheneinstellung des Geräts selbst anpassen!',
      setup() { resetEnv(); setGases('single', [{ o2: 21 }]); S.env.psurf = 0.815; S.env.rho = 1000; S.env.tempWater = 8; },
      steps: [{ to: 20, rate: 15 }, { hold: 20 * 60 }, { to: 5, rate: 9 }, { until: (l, d) => d && (d.safety.done || !d.safety.required) }, { to: 0, rate: 6 }] },
    { name: 'Trocken (Druckkammer, kein Wasserkontakt)', desc: 'Start erst bei Starttiefe + 1,8 m.',
      setup() { resetEnv(); S.env.wetMode = 'dry'; },
      steps: [{ to: 2.5, rate: 5 }, { hold: 30 }, { to: 4, rate: 5 }, { hold: 120 }, { to: 0, rate: 5 }], scale: 2 },
  ];

  function liveText() {
    const l = SN.sim.live, dv = SN.sim.dive, m = S.mode();
    const al = Array.from(SN.alarms.active.values()).map((a) => a.def.id + (a.acked ? '✓' : '!')).join(', ') || '–';
    const r = [
      ['Zustand', SN.app.power + (l.aod ? ' (AOD)' : '') + (l.sleeping ? ' (Ruhe)' : '') + (SN.app.locked ? ' 🔒' : '') + (S.settings.buttonLock ? ' ⛔Tasten' : '')],
      ['Sim-Zeit', new Date(S.now()).toLocaleString()],
      ['Tauchgang', dv ? 'aktiv ' + SN.fmt.mmss(dv.runtime) + (dv.surfacedAt != null ? ' (Oberfl.)' : '') : 'nein'],
      ['Wahre Tiefe', S.env.depth.toFixed(2) + ' m'],
      ['Angez. Tiefe', l.depth.toFixed(2) + ' m'],
      ['p amb', l.pamb.toFixed(3) + ' bar'],
      ['Aufstieg', l.ascRate.toFixed(1) + ' m/min'],
      ['NDL / TTS', (l.ndl == null ? '–' : l.ndl >= 100 ? '>99' : l.ndl) + ' / ' + l.tts.toFixed(1) + ' min'],
      ['Ceiling / Dekostufe', l.ceiling.toFixed(1) + ' / ' + l.deko.toFixed(1) + ' m' + (l.inWindow ? ' (Fenster)' : '') + (l.above !== 'none' ? ' ' + l.above : '')],
      ['Stopps', l.plan && l.plan.stops.length ? l.plan.stops.map((s) => s.depth + 'm ' + Math.ceil(s.time) + '′').join(', ') : '–'],
      ['GF99 / Surf GF', Math.round(l.gf99) + ' / ' + Math.round(l.surfGF) + ' %'],
      ['ppO₂', l.ppo2.toFixed(2)],
      ['CNS / OTU', S.cns.toFixed(1) + ' % / ' + SN.sim.dailyOTU().toFixed(0)],
      ['AMV / Gaszeit', (l.rmv ? l.rmv.toFixed(1) + ' l/min' : '–') + ' / ' + (l.gasTime != null ? Math.round(l.gasTime) + ' min' : '–')],
      ['Sicherheitsstopp', dv && dv.safety.required ? (dv.safety.done ? 'fertig' : SN.fmt.mmss(dv.safety.remaining)) : '–'],
      ['Flugverbot', SN.sim.noFlyRemaining() ? (SN.sim.noFlyRemaining() / 3600).toFixed(1) + ' h' : '–'],
      ['Alarme', al],
      ['Szenario', scen.name ? scen.name + (scen.steps ? ' (Schritt ' + (scen.i + 1) + '/' + scen.steps.length + ')' : '') : '–'],
    ];
    return r.map(([k, v]) => '<div><b>' + k + '</b><span>' + SN.esc(String(v)) + '</span></div>').join('');
  }

  function build() {
    root = $('#debug');
    const env = S.env;
    const liveBox = h('div', { cls: 'live', id: 'dbg-live' });

    const devButtons = h('div', { cls: 'pad' },
      h('div', { cls: 'padrow' }, btn('▲ Up', () => SN.app.tap('up')), btn('↩ Back', () => SN.app.tap('back'))),
      h('div', { cls: 'padrow' }, btn('▼ Down', () => SN.app.tap('down')), btn('OK', () => SN.app.tap('ok'))),
      h('div', { cls: 'padrow small' }, btn('Up lang', () => SN.app.tap('up', true)), btn('Back lang', () => SN.app.tap('back', true)), btn('Down lang', () => SN.app.tap('down', true)), btn('OK lang', () => SN.app.tap('ok', true))));

    root.append(
      h('h2', {}, 'Debug-Menü'),
      h('p', { cls: 'hint' }, 'Tastatur: ↑/W = Up · ↓/S = Down · Enter/D = OK · Esc/Backspace/A = Back · Taste ≥ 0,9 s halten = lang. Alle 4 Tasten 12 s = Neustart.'),
      section('Live-Werte', true, liveBox),
      section('Zeit & Gerät', true,
        h('div', { cls: 'btns' }, ...[1, 5, 10, 30, 60, 300].map((s) => btn(s + '×', () => { env.timeScale = s; }, 'ts ts' + s))),
        btns(btn('+10 min', () => skip(600)), btn('+1 h', () => skip(3600)), btn('+12 h', () => skip(43200)), btn('+48 h', () => skip(172800))),
        btns(btn('Einschalten (Up lang)', () => SN.app.tap('up', true)), btn('Handgelenk heben', () => SN.app.raiseWrist()), btn('Neustart (4 Tasten)', () => SN.app.reboot('', null))),
        slider('Akku', 0, 100, 1, () => env.battery, (v) => { env.battery = v; }, '%'),
        check('USB-Ladekabel angeschlossen', () => env.charging, (v) => { env.charging = v; if (v && env.updateAvailable) SN.ui.showToast('Update available', 2500); }),
        check('Suunto App verbunden (Wetter/Gezeiten)', () => env.app, (v) => { env.app = v; }),
        check('Softwareupdate verfügbar', () => env.updateAvailable, (v) => { env.updateAvailable = v; }),
        btns(btn('App-Kopplung starten', pairApp), btn('Werkseinstellungen', () => { if (confirm('Alle Daten löschen?')) SN.app.factoryReset(); }, 'warn'))),
      section('Tasten (Maus)', false, devButtons),
      section('Tiefe & Wasser', true,
        slider('Zieltiefe', 0, 120, 0.1, () => env.targetDepth, (v) => { env.targetDepth = v; stopScenario(); env.targetDepth = v; }, 'm'),
        slider('Geschwindigkeit', 1, 40, 1, () => env.rate, (v) => { env.rate = v; }, 'm/min'),
        btns(...[0, 3, 5, 10, 18, 30, 40, 60].map((d) => btn(d + ' m', () => { stopScenario(); env.targetDepth = d; }))),
        btns(btn('Halten', () => { stopScenario(); env.targetDepth = env.depth; }), btn('Sofort auf Zieltiefe', () => SN.sim.setDepthNow(env.targetDepth))),
        select('Wasserkontakt', [['auto', 'automatisch (nass wenn Tiefe > 0)'], ['dry', 'trocken erzwingen'], ['wet', 'nass erzwingen']], () => env.wetMode, (v) => { env.wetMode = v; }),
        select('Reale Wasserdichte', [['1025', 'Salzwasser 1025 kg/m³'], ['1000', 'Süßwasser 1000 kg/m³'], ['1019.716', 'EN13319 1019,7 kg/m³']], () => String(env.rho), (v) => { env.rho = parseFloat(v); }),
        numIn('Luftdruck', 0.001, () => env.psurf, (v) => { env.psurf = v; }, 'bar'),
        btns(btn('Meereshöhe', () => { env.psurf = 1.01325; }), btn('1000 m', () => { env.psurf = alt(1000); }), btn('2000 m', () => { env.psurf = alt(2000); }), btn('3500 m', () => { env.psurf = alt(3500); })),
        slider('Wassertemp.', -2, 35, 1, () => env.tempWater, (v) => { env.tempWater = v; }, '°C'),
        slider('Lufttemp.', -10, 45, 1, () => env.tempAir, (v) => { env.tempAir = v; }, '°C')),
      section('Kompass, GPS, Herzfrequenz', false,
        slider('Kurs', 0, 359, 1, () => env.heading, (v) => { env.heading = v; }, '°'),
        check('Kompass kalibriert', () => env.compassCal, (v) => { env.compassCal = v; }),
        select('GPS', [['ok', 'Signal verfügbar'], ['none', 'kein Signal']], () => env.gps, (v) => { env.gps = v; }),
        slider('GPS-Fix-Dauer', 0, 120, 1, () => env.gpsFixSec, (v) => { env.gpsFixSec = v; }, 's'),
        numIn('Breite', 0.0001, () => env.lat, (v) => { env.lat = v; }), numIn('Länge', 0.0001, () => env.lon, (v) => { env.lon = v; }),
        check('HF-Gurt eingeschaltet', () => env.hrBeltOn, (v) => { env.hrBeltOn = v; }),
        slider('Herzfrequenz', 40, 190, 1, () => env.hr, (v) => { env.hr = v; }, 'bpm')),
      section('Tank PODs & Atmung', true,
        slider('AMV (Oberfläche)', 5, 60, 1, () => env.sac, (v) => { env.sac = v; }, 'l/min'),
        select('Sidemount: atmen aus', [['0', 'Flasche 1'], ['1', 'Flasche 2']], () => String(env.breatheFrom), (v) => { env.breatheFrom = parseInt(v, 10); }),
        ...env.pods.map((p, i) => h('div', { cls: 'pod' }, h('b', {}, 'POD ' + (i + 1) + ' · ' + p.serial),
          slider('Druck', 0, 300, 1, () => p.pressure, (v) => { p.pressure = v; }, 'bar'),
          check('aktiv (sendet)', () => p.active, (v) => { p.active = v; }),
          check('in Reichweite / Ventil offen', () => p.inRange, (v) => { p.inRange = v; }),
          check('Akku schwach', () => p.battery === 'low', (v) => { p.battery = v ? 'low' : 'ok'; })))),
      section('Szenarien', true,
        h('div', { cls: 'scen' }, ...SCENARIOS.map((sc) => h('div', { cls: 'sc' }, btn(sc.name, () => runScenario(sc)), h('small', {}, sc.desc)))),
        btns(btn('Szenario stoppen', stopScenario, 'warn')),
        h('p', { cls: 'hint' }, 'Szenarien setzen Gase/Modus des Geräts passend und laufen im Zeitraffer. Danach Tiefe/Zeitraffer frei weiter steuerbar.')),
      section('Wetter & Gezeiten (App-Daten)', false,
        slider('Temperatur', -20, 40, 1, () => env.weather.temp, (v) => { env.weather.temp = v; }, '°C'),
        slider('Wind', 0, 30, 1, () => env.weather.wind, (v) => { env.weather.wind = v; }, 'm/s'),
        slider('Gezeitenhöhe', -2, 4, 0.1, () => env.tides.height, (v) => { env.tides.height = v; }, 'm'),
        slider('Wellenhöhe', 0, 5, 0.1, () => env.tides.wave, (v) => { env.tides.wave = v; }, 'm')),
    );
  }
  function alt(m) { return +(1.01325 * Math.pow(1 - 2.25577e-5 * m, 5.25588)).toFixed(3); }
  function skip(sec) {
    if (SN.sim.dive) { // im Tauchgang: in 1-s-Schritten simulieren
      const n = Math.min(sec, 7200);
      for (let i = 0; i < n; i++) SN.sim.tick(1 / S.env.timeScale);
      return;
    }
    S.simOffset += sec * 1000;
    SN.sim.fastForward(sec);
  }
  function pairApp() {
    const bt = S.settings.bt;
    if (bt.airplane) { SN.ui.showToast('Airplane mode', 2000); return; }
    if (!bt.discovery) { SN.ui.showToast('Discovery off', 2000); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    SN.app.wake();
    SN.ui.showToast('Pairing code<br><b style="font-size:54px">' + code + '</b>', 6000);
    setTimeout(() => { S.env.app = true; }, 4000);
  }

  function refresh() {
    scenTick();
    const lv = document.getElementById('dbg-live');
    if (lv && lv.closest('details').open) lv.innerHTML = liveText();
    for (const b of binds) {
      if (document.activeElement === b.el) continue;
      const v = b.get();
      if (b.isCheck) b.el.checked = !!v;
      else if (b.isSel) b.el.value = v;
      else if (b.isNum) b.el.value = v;
      else { b.el.value = v; if (b.out) b.out.textContent = (b.step < 1 ? (+v).toFixed(1) : Math.round(v)) + ' ' + (b.unit || ''); }
    }
    document.querySelectorAll('#debug .ts').forEach((e) => e.classList.toggle('on', e.textContent === S.env.timeScale + '×'));
  }

  SN.debug = { refresh, runScenario, SCENARIOS };
  document.addEventListener('DOMContentLoaded', build);
})(typeof window !== 'undefined' ? window : globalThis);
