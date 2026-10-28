/* Menüs und Ansichten (Kap. 3–5, 7, 8, 10–12) */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});
  const S = SN.state;
  const { nav, I, iconBox, ListScreen, PickerScreen, InfoScreen, confirm, range } = SN.ui;
  const t = (s) => SN.t(s);
  const esc = SN.esc;
  const num = (...a) => SN.face.num(...a);
  const fmt = SN.fmt;
  const push = (s) => nav.push(s);
  const L = (o) => new ListScreen(o);
  const toast = (s) => SN.ui.showToast(esc(t(s)));

  function radioList(title, opts, get, set, back = true) {
    return L({
      title,
      items: () => opts.map((o) => ({ label: o[1], sub: o[2], kind: 'radio', value: get() === o[0], onOk: () => { set(o[0]); S.save(); if (back) nav.pop(); } })),
    });
  }
  function on(v) { return v ? t('On') : t('Off'); }
  function depthStr(m, dec = 1) { const d = SN.U.depth(m, dec); return d.v + ' ' + d.u; }

  // =================== Taucheinstellungen (Nach-unten-Taste) ===================
  function diveSettings() {
    push(L({
      title: 'DIVE SETTINGS',
      items: () => {
        const m = S.mode();
        return [
          { label: 'Dive mode', sub: S.settings.diveMode === 'single' ? 'Single gas' : 'Multigas', icon: iconBox(I.diver), onOk: diveMode },
          { label: 'Gases', sub: S.usableGases().map(fmt.gasName).join(', '), icon: iconBox(I.tank), onOk: gases },
          { label: 'Algorithm', sub: m.algo.enabled ? S.gf().lo + '/' + S.gf().hi : t('Off'), icon: iconBox(I.sliders), onOk: algorithm },
          { label: 'Alarms', icon: iconBox(I.warn), onOk: alarms },
          { label: 'Tank PODs', icon: iconBox(I.pod), onOk: tankPodsMenu },
          { label: 'Dive planner', icon: iconBox(I.planner), onOk: planner },
          { label: 'Customization', icon: iconBox(I.sliders), onOk: customization },
          { label: 'Additional settings', icon: iconBox(I.dots), onOk: additional },
        ];
      },
    }));
  }

  function diveMode() {
    push(L({
      title: 'DIVE MODE',
      items: () => [
        { label: 'Single gas', icon: iconBox(I.tank), value: S.settings.diveMode === 'single', onOk: () => { S.settings.diveMode = 'single'; nav.pop(); } },
        { label: 'Multigas', icon: iconBox(I.tank2), value: S.settings.diveMode === 'multi', onOk: () => { S.settings.diveMode = 'multi'; nav.pop(); } },
      ],
    }));
  }

  // =================== Gase (Kap. 5) ===================
  function gasRow(g) {
    const pods = SN.sim.podsFor(g);
    const md = SN.U.depth(SN.Deco.mod(g), 1);
    const isA = g.state === 'active';
    let right = '';
    if (pods.length === 1) {
      const p = pods[0];
      right = '<div class="gpod"><div class="gpl">' + I.pod + '</div><div class="gpk">TANKPOD</div><div class="gpv">' + (p.data ? SN.U.press(p.pressure).v + ' ' + SN.U.press(0).u : '- -') + '</div></div>';
    } else if (pods.length === 2) {
      right = '<div class="gpod two"><div class="gpl">' + I.pod + I.pod + '</div><div class="gpk"><span>POD 1</span><span>POD 2</span></div><div class="gpv">' +
        pods.map((p) => '<span>' + (p.data ? SN.U.press(p.pressure).v : '- -') + '</span>').join('') + '<small>' + SN.U.press(0).u + '</small></div></div>';
    }
    return '<div class="gasrow"><div class="gl"><div class="gn">' + (isA ? '<span class="gchk">' + I.check + '</span>' : g.state === 'enabled' ? '<span class="gchk en">' + I.check + '</span>' : '') + esc(fmt.gasName(g)) + '</div>' +
      '<div class="gk"><span>ppO₂</span><span>MOD</span></div><div class="gv"><span>' + g.ppo2.toFixed(1) + '</span><span>' + md.v + '<small>' + md.u + '</small></span></div></div>' + right + '</div>';
  }

  function gases() {
    push(L({
      title: 'GASES',
      items: () => {
        const m = S.mode();
        const multi = S.settings.diveMode === 'multi';
        const max = multi ? 5 : 6;
        const its = [];
        if (m.gases.length < max) its.push({ label: 'New gas', icon: iconBox(I.plus, 'green'), onOk: newGas });
        const order = { active: 0, enabled: 1, disabled: 2 };
        const list = m.gases.slice().sort((a, b) => order[a.state] - order[b.state] || a.o2 - b.o2);
        let sec = false;
        for (const g of list) {
          if (g.state === 'disabled' && !sec) { its.push({ kind: 'section', label: 'DISABLED GASES' }); sec = true; }
          its.push({ html: gasRow(g), h: 118, cls: 'gas ' + g.state, onOk: () => gasEdit(g) });
        }
        return its;
      },
    }));
  }
  function newGas() {
    const m = S.mode();
    const multi = S.settings.diveMode === 'multi';
    const g = S.newGas(32, 0, 1.4, multi ? 'enabled' : 'disabled');
    m.gases.push(g);
    S.save();
    gasEdit(g);
    gasMixture(g);
  }

  function gasEdit(g) {
    push(L({
      title: () => 'EDIT ' + fmt.gasName(g),
      get titleStr() { return 'EDIT ' + fmt.gasName(g); },
      items: () => {
        const m = S.mode();
        const pods = SN.sim.podsFor(g);
        const md = SN.U.depth(SN.Deco.mod(g), 1);
        const stLabel = g.state === 'active' ? 'Active gas' : g.state === 'enabled' ? 'Enabled' : 'Disabled';
        const its = [
          { label: stLabel, cls: 'stateband ' + g.state, h: 48, onOk: () => gasState(g) },
          { html: '<div class="mixrow"><div><div class="mk">MIXTURE</div><div class="mv">' + esc(fmt.gasName(g)) + '</div></div><div><div class="mk">ppO₂</div><div class="mv">' + g.ppo2.toFixed(1) + '</div></div><div><div class="mk">MOD</div><div class="mv">' + md.v + '<small>' + md.u + '</small></div></div></div>', h: 76, onOk: () => gasMixture(g) },
          { label: 'Tank size', sub: tankSizeStr(g.tank), onOk: () => tankSize(g) },
          { label: 'Tank POD', sub: pods.length ? pods.map((p) => fmtSerial(p.serial)).join(', ') : t('Not linked'), onOk: () => tankPodLink(g) },
        ];
        if (g.state !== 'active') its.push({ label: 'Delete gas', icon: iconBox(I.trash, 'red'), onOk: () => { m.gases.splice(m.gases.indexOf(g), 1); nav.pop(); } });
        return its;
      },
    }));
    nav.top().title = 'EDIT ' + fmt.gasName(g);
    const s = nav.top();
    const r = s.render.bind(s);
    s.render = () => { s.title = 'EDIT ' + fmt.gasName(g); return r(); };
  }
  function gasState(g) {
    const multi = S.settings.diveMode === 'multi';
    const opts = multi ? [['active', 'Active'], ['enabled', 'Enabled'], ['disabled', 'Disabled']] : [['active', 'Active'], ['disabled', 'Disabled']];
    push(L({
      title: 'GAS STATE',
      items: () => opts.map(([k, lbl]) => ({
        label: lbl, icon: iconBox(I.tank, k === 'active' ? 'green' : k === 'enabled' ? '' : 'dim'), value: g.state === k,
        onOk: () => {
          const m = S.mode();
          if (g.state === 'active' && k !== 'active') { toast('Active gas'); nav.pop(); return; } // aktives Gas kann nicht abgewählt werden
          if (k === 'active') { m.gases.forEach((x) => { if (x.state === 'active') x.state = multi ? 'enabled' : 'disabled'; }); }
          if (multi && k !== 'disabled' && m.gases.filter((x) => x.state !== 'disabled' && x !== g).length >= 5) { nav.pop(); return; }
          g.state = k; nav.pop();
        },
      })),
    }));
  }
  function gasMixture(g) {
    const multi = S.settings.diveMode === 'multi';
    const o2s = range(multi ? 5 : 21, 100, 1);
    const pps = range(1.0, 1.6, 0.1, 1);
    const cols = [{ label: 'O₂', values: o2s, index: Math.max(0, o2s.indexOf(g.o2)) }];
    if (multi) cols.push({ label: 'HE', values: range(0, 100 - g.o2, 1), index: g.he });
    cols.push({ label: 'ppO₂', values: pps, index: Math.max(0, pps.indexOf(+g.ppo2.toFixed(1))), fmt: (v) => v.toFixed(1) });
    const p = new PickerScreen({
      title: 'GAS MIXTURE', cols, final: 'check',
      onChange: (s) => {
        if (multi) {
          const o2 = s.cols[0].values[s.cols[0].index];
          const heCol = s.cols[1];
          const cur = heCol.values[heCol.index];
          heCol.values = range(0, 100 - o2, 1);
          heCol.index = Math.min(cur, heCol.values.length - 1);
        }
      },
      footer: (v) => {
        const gg = { o2: v[0], ppo2: v[v.length - 1] };
        const md = SN.U.depth(SN.Deco.mod(gg), 1);
        return '<span class="fk">MOD</span> ' + num(md.v, md.u);
      },
      onDone: (v) => { g.o2 = v[0]; g.he = multi ? v[1] : 0; g.ppo2 = v[v.length - 1]; nav.pop(); },
    });
    push(p);
  }
  const TANKS_L = [3, 5, 7, 8, 10, 11.1, 12, 15, 18, 20, 24];
  const TANKS_CF = [40, 50, 63, 66, 72, 77, 80, 85, 95, 100, 117, 120, 130];
  function cfToL(cf) { return +(cf * 28.3168 / 207).toFixed(1); }
  function tankSizeStr(l) {
    if (S.settings.units.volume === 'cuft') return Math.round(l * 207 / 28.3168) + ' cu ft';
    return l + ' L';
  }
  function tankSize(g) {
    const cf = S.settings.units.volume === 'cuft';
    const vals = cf ? TANKS_CF : TANKS_L;
    let idx = cf ? vals.findIndex((v) => Math.abs(cfToL(v) - g.tank) < 0.3) : vals.indexOf(g.tank);
    if (idx < 0) idx = vals.indexOf(cf ? 80 : 12);
    push(new PickerScreen({
      title: 'TANK SIZE', cols: [{ values: vals, index: idx, unit: cf ? 'cu ft' : 'L' }], final: 'check',
      onDone: (v) => { g.tank = cf ? cfToL(v[0]) : v[0]; nav.pop(); },
    }));
  }
  function fmtSerial(s) { return s.replace(/(\d{4})(\d{4})(\d+)/, '$1 $2 $3'); }

  function podCard(pod, g) {
    const linked = linkedGases(pod.serial);
    return '<div class="podcard"><span class="pic ' + (linked.length ? 'g' : '') + '">' + I.pod + '</span><div><div class="ps">' + fmtSerial(pod.serial) + '</div>' +
      '<div class="pm">' + I.tank + ' ' + (pod.inRange && pod.active ? SN.U.press(pod.pressure).v + ' ' + SN.U.press(0).u : '- -') +
      ' &nbsp;⚡ ' + (pod.battery === 'low' ? '<b class="lowb">LOW</b>' : 'OK') + (linked.length ? ' &nbsp;<span class="lk">∞ ' + linked.map(fmt.gasName).join(', ') + '</span>' : '') + '</div></div></div>';
  }
  function linkedGases(serial) {
    const out = [];
    for (const k of ['single', 'multi']) if (k === S.settings.diveMode) S.settings.modes[k].gases.forEach((g) => { if (g.pods.includes(serial)) out.push(g); });
    return out;
  }
  function tankPodLink(g) {
    push(L({
      title: 'LINKED TANK PODS',
      items: () => {
        const its = [];
        [0, 1].forEach((slot) => {
          its.push({ kind: 'section', label: 'TANK POD ' + (slot + 1) + ':', cls: 'plain' });
          const ser = g.pods[slot];
          const pod = ser && S.env.pods.find((p) => p.serial === ser);
          if (pod) its.push({ html: podCard(pod, g), h: 92, cls: 'card', onOk: () => podPick(g, slot) });
          else its.push({ label: 'No tank POD', cls: 'card', onOk: () => podPick(g, slot) });
        });
        return its;
      },
    }));
    const s = nav.top(); const r = s.render.bind(s);
    s.render = () => { s.title = fmt.gasName(g) + ' - LINKED TANK PODS'; return r(); };
  }
  function podPick(g, slot) {
    push(L({
      title: 'TANK PODS',
      items: () => {
        // nur aktive PODs in Reichweite werden gefunden (Kap. 6.1)
        const found = S.env.pods.filter((p) => p.inRange && p.active);
        if (!found.length) return [{ label: 'No tank POD', kind: 'info' }];
        return found.map((p) => ({
          html: podCard(p, g), h: 92, kind: 'check', value: g.pods[slot] === p.serial,
          onOk: () => {
            if (g.pods[slot] === p.serial) g.pods[slot] = null;
            else { g.pods[slot] = p.serial; if (g.pods[1 - slot] === p.serial) g.pods[1 - slot] = null; }
            nav.pop();
          },
        }));
      },
    }));
  }
  function tankPodsMenu() {
    push(L({
      title: 'TANK PODS',
      items: () => {
        const found = S.env.pods.filter((p) => linkedGases(p.serial).length || (p.inRange && p.active));
        if (!found.length) return [{ label: 'No tank POD', kind: 'info' }];
        return found.map((p) => ({
          html: podCard(p), h: 92,
          onOk: () => {
            const lg = linkedGases(p.serial);
            if (!lg.length) return;
            if (!(p.inRange && p.active)) { toast('- -'); return; } // Trennen nur, wenn POD aktiv ist und sendet
            push(confirm('Remove', 'Tank POD ' + fmtSerial(p.serial) + ' ⟶ ' + lg.map(fmt.gasName).join(', '), 'Remove', () => {
              lg.forEach((g) => { g.pods = g.pods.map((x) => (x === p.serial ? null : x)); });
            }));
          },
        }));
      },
    }));
  }

  // =================== Algorithmus (Kap. 8) ===================
  const CONS = [['low', 'Low', '45 / 95'], ['medium', 'Medium', '40 / 85'], ['high', 'High', '35 / 75']];
  const SAFETY = [['3', '3 min'], ['4', '4 min'], ['5', '5 min'], ['adjusted', 'Adjusted'], ['off', 'Always off']];
  const ALT = [[0, '0-300 m'], [1, '300-1500 m'], [2, '1500-3000 m']];
  const ALT_FT = [[0, '0-980 ft'], [1, '980-4900 ft'], [2, '4900-9800 ft']];
  function altOpts() { return S.settings.units.depth === 'ft' ? ALT_FT : ALT; }
  function algorithm() {
    push(L({
      title: 'ALGORITHM',
      items: () => {
        const a = S.mode().algo;
        const g = S.gf();
        const its = [{ label: 'Algorithm', sub: on(a.enabled), kind: 'toggle', value: a.enabled, set: (v) => { a.enabled = v; } }];
        if (!a.enabled) return its;
        return its.concat([
          { label: 'Conservatism', sub: t((CONS.find((c) => c[0] === a.cons) || ['', 'Custom'])[1]) + ' ' + g.lo + '/' + g.hi, onOk: conservatism },
          { label: 'Deco profile', sub: a.profile === 'stepped' ? 'Stepped' : 'Continuous', onOk: () => push(radioList('Deco profile', [['continuous', 'Continuous'], ['stepped', 'Stepped']], () => a.profile, (v) => { a.profile = v; })) },
          { label: 'Safety stop', sub: SAFETY.find((x) => x[0] === a.safety)[1], onOk: () => push(radioList('SAFETY STOP', SAFETY, () => a.safety, (v) => { a.safety = v; })) },
          { label: 'Last deco stop', sub: depthStr(a.lastStop, 0), onOk: () => push(radioList('Last deco stop', [[3, depthStr(3, 0)], [6, depthStr(6, 0)]], () => a.lastStop, (v) => { a.lastStop = v; })) },
          { label: 'Altitude', sub: altOpts()[a.altitude][1], onOk: () => push(radioList('Altitude', altOpts(), () => a.altitude, (v) => { a.altitude = v; })) },
        ]);
      },
    }));
  }
  function conservatism() {
    const a = S.mode().algo;
    push(L({
      title: 'CONSERVATISM',
      items: () => CONS.map((c) => ({ label: c[1], sub: c[2], value: a.cons === c[0], onOk: () => { a.cons = c[0]; nav.pop(); } }))
        .concat([{ label: 'Custom', sub: a.custom.lo + ' / ' + a.custom.hi, value: a.cons === 'custom', onOk: () => {
          const lo = range(10, 100, 5), hi = range(10, 100, 5);
          push(new PickerScreen({
            title: 'Custom', final: 'check',
            cols: [{ label: 'GF LOW', values: lo, index: lo.indexOf(a.custom.lo) }, { label: 'GF HIGH', values: hi, index: hi.indexOf(a.custom.hi) }],
            onDone: (v) => { a.custom = { lo: Math.min(v[0], v[1]), hi: Math.max(v[0], v[1]) }; a.cons = 'custom'; nav.popTo(nav.stack.length - 2); },
          }));
        } }]),
    }));
  }

  // =================== Alarme (Kap. 7) ===================
  const ALARM_TYPES = [
    ['depth', 'Depth'], ['time', 'Dive time'], ['tank', 'Tank pressure'], ['ndl', 'NDL'], ['gastime', 'Gas time'], ['sidemount', 'Sidemount'],
  ];
  function alarms() {
    push(L({
      title: 'ALARMS',
      items: () => {
        const a = S.mode().alarms;
        return ALARM_TYPES.map(([k, lbl]) => ({ label: lbl, sub: a[k].length + ' alarms', onOk: () => alarmList(k, lbl) }))
          .concat([
            { label: 'Mute all audio', kind: 'toggle', value: a.muteAudio, set: (v) => { a.muteAudio = v; } },
            { label: 'Mute all vibration', kind: 'toggle', value: a.muteVib, set: (v) => { a.muteVib = v; } },
          ]);
      },
    }));
  }
  function alarmValStr(k, v) {
    if (k === 'depth') return depthStr(v, 1);
    if (k === 'time') return fmt.mmss(v);
    if (k === 'tank' || k === 'sidemount') { const p = SN.U.press(v); return p.v + ' ' + p.u; }
    return v + ' min';
  }
  function alarmList(k, lbl) {
    push(L({
      title: lbl.toUpperCase(),
      items: () => {
        const arr = S.mode().alarms[k];
        const its = arr.map((x, i) => ({ label: alarmValStr(k, x.v), sub: x.look === 'caution' ? 'Caution' : 'Notify', icon: iconBox(x.look === 'caution' ? I.warn : I.info, x.look === 'caution' ? 'yellow' : 'cyan'), onOk: () => alarmEdit(k, x) }));
        if (arr.length < 5) its.push({ label: 'New alarm', icon: iconBox(I.plus, 'green'), onOk: () => {
          const def = { depth: 30, time: 30 * 60, tank: 100, ndl: 5, gastime: 10, sidemount: 20 }[k];
          const x = { v: def, look: 'notify', tone: 'short', audio: true, vib: true, on: true };
          arr.push(x); alarmValue(k, x, true);
        } });
        return its;
      },
    }));
  }
  function alarmValue(k, x, isNew) {
    const done = () => { nav.pop(); if (isNew) alarmEdit(k, x); };
    if (k === 'time') {
      push(new PickerScreen({
        title: 'Dive time', final: 'check',
        cols: [{ values: range(0, 99, 1), index: Math.floor(x.v / 60), unit: 'min' }, { values: range(0, 59, 1), index: x.v % 60, unit: 's', fmt: (v) => String(v).padStart(2, '0') }],
        onDone: (v) => { x.v = Math.max(1, v[0] * 60 + v[1]); done(); },
      }));
      return;
    }
    let vals, unit, toV = (v) => v, fromV = (v) => v;
    if (k === 'depth') {
      vals = range(3, 199, 1); unit = SN.U.depth(0).u;
      if (unit === 'ft') { vals = range(10, 650, 5); toV = (v) => v / 3.28084; fromV = (v) => Math.round(v * 3.28084 / 5) * 5; }
    } else if (k === 'tank') {
      vals = range(51, 360, 1); unit = SN.U.press(0).u;
      if (unit === 'psi') { vals = range(740, 5220, 10); toV = (v) => v / 14.5038; fromV = (v) => Math.round(v * 14.5038 / 10) * 10; }
    } else if (k === 'sidemount') { vals = range(5, 70, 1); unit = SN.U.press(0).u; }
    else if (k === 'ndl') { vals = range(1, 99, 1); unit = 'min'; }
    else { vals = range(1, 99, 1); unit = 'min'; }
    let idx = vals.indexOf(fromV(x.v)); if (idx < 0) idx = 0;
    push(new PickerScreen({ title: ALARM_TYPES.find((a) => a[0] === k)[1], final: 'check', cols: [{ values: vals, index: idx, unit }], onDone: (v) => { x.v = toV(v[0]); done(); } }));
  }
  function alarmEdit(k, x) {
    push(L({
      title: ALARM_TYPES.find((a) => a[0] === k)[1].toUpperCase(),
      items: () => [
        { label: 'Alarm', sub: alarmValStr(k, x.v), onOk: () => alarmValue(k, x) },
        { label: 'Appearance', sub: x.look === 'caution' ? 'Caution' : 'Notify', onOk: () => push(L({
          title: 'APPEARANCE',
          items: () => [
            { label: 'Notify', icon: iconBox(I.info, 'cyan'), value: x.look === 'notify', onOk: () => { x.look = 'notify'; nav.pop(); } },
            { label: 'Caution', icon: iconBox(I.warn, 'yellow'), value: x.look === 'caution', onOk: () => { x.look = 'caution'; nav.pop(); } },
          ],
        })) },
        { label: 'Audio & vibration', sub: (x.audio ? t(x.tone === 'long' ? 'Long' : 'Short') : t('Off')) + ' · ' + t('Vibration') + ' ' + on(x.vib), onOk: () => push(L({
          title: 'AUDIO & VIBRATION',
          items: () => {
            const a = S.mode().alarms;
            return [
              { label: 'Alarm tone', sub: x.tone === 'long' ? 'Long' : 'Short', onOk: () => push(radioList('Alarm tone', [['short', 'Short'], ['long', 'Long']], () => x.tone, (v) => { x.tone = v; })) },
              { label: 'Audio', sub: on(x.audio && !a.muteAudio), kind: 'toggle', value: x.audio && !a.muteAudio, disabled: a.muteAudio, set: (v) => { x.audio = v; } },
              { label: 'Vibration', sub: on(x.vib && !a.muteVib), kind: 'toggle', value: x.vib && !a.muteVib, disabled: a.muteVib, set: (v) => { x.vib = v; } },
            ];
          },
        })) },
        { label: 'Delete', icon: iconBox(I.trash, 'red'), onOk: () => { const arr = S.mode().alarms[k]; arr.splice(arr.indexOf(x), 1); nav.pop(); } },
      ],
    }));
  }

  // =================== Personalisierung / Umschaltfenster (Kap. 4.6) ===================
  function customization() {
    push(L({
      title: 'CUSTOMIZATION',
      items: () => [
        { label: 'Switch window', sub: S.mode().views.length + ' views', onOk: switchWindow },
        { label: 'No deco field', sub: S.mode().decoField === 'ndltts' ? 'NDL & TTS' : 'NDL', onOk: () => push(radioList('No deco field', [['ndl', 'NDL'], ['ndltts', 'NDL & TTS']], () => S.mode().decoField, (v) => { S.mode().decoField = v; })) },
      ],
    }));
  }
  const fname = (k) => (k ? t(SN.face.FIELDS[k].name) : 'None');
  function switchWindow() {
    push(L({
      title: 'SWITCH WINDOW',
      items: () => {
        const vs = S.mode().views;
        const its = vs.map((v, i) => ({ label: v.f.filter(Boolean).map(fname).join(', '), sub: 'View ' + (i + 1), cls: 'subtop', icon: iconBox(v.type === 'double' ? '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="7" rx="1.5" fill="currentColor"/><rect x="4" y="13" width="16" height="7" rx="1.5" fill="currentColor"/></svg>' : '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>'), onOk: () => viewEdit(v, false) }));
        if (vs.length < 10) its.push({ label: 'Add new view', icon: iconBox(I.plus, 'green'), onOk: () => push(L({
          title: 'VIEW TYPE',
          items: [
            { label: 'Double', icon: iconBox('<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="7" rx="1.5" fill="currentColor"/><rect x="4" y="13" width="16" height="7" rx="1.5" fill="currentColor"/></svg>'), onOk: () => { nav.pop(); viewEdit({ type: 'double', f: [null, null] }, true); } },
            { label: 'Large', icon: iconBox('<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>'), onOk: () => { nav.pop(); viewEdit({ type: 'large', f: [null] }, true); } },
          ],
        })) });
        return its;
      },
    }));
  }
  function viewEdit(v, isNew) {
    const work = { type: v.type, f: v.f.slice() };
    const s = L({
      title: isNew ? 'NEW VIEW' : 'EDIT VIEW ' + (S.mode().views.indexOf(v) + 1),
      cls: 'viewedit',
      top: () => {
        const prev = work.type === 'double'
          ? '<div class="pv half">' + (work.f[0] ? SN.face.fieldHTML(work.f[0], 'half') : '') + '</div><div class="pv half">' + (work.f[1] ? SN.face.fieldHTML(work.f[1], 'half') : '') + '</div>'
          : '<div class="pv large">' + (work.f[0] ? SN.face.fieldHTML(work.f[0], 'large') : '') + '</div>';
        return '<div class="vprev">' + prev + '</div>';
      },
      items: () => {
        const its = work.f.map((k, i) => ({ label: fname(k), sub: 'Field ' + (i + 1), cls: 'subtop', onOk: () => fieldPick(work, i) }));
        const ok = work.f.every(Boolean);
        if (isNew) its.push({ label: 'Save view', icon: iconBox(I.check, 'green'), disabled: !ok, onOk: () => { S.mode().views.push(work); nav.pop(); } });
        else {
          its.push({ label: 'Done', icon: iconBox(I.check, 'green'), onOk: () => { v.f = work.f; nav.pop(); } });
          if (S.mode().views.length > 1) its.push({ label: 'Delete view', icon: iconBox(I.trash, 'red'), onOk: () => { const vs = S.mode().views; vs.splice(vs.indexOf(v), 1); S.mode().viewIndex = 0; nav.pop(); } });
        }
        return its;
      },
    });
    push(s);
  }
  function fieldPick(work, i) {
    const keys = Object.keys(SN.face.FIELDS).filter((k) => work.type === 'large' || !SN.face.FIELDS[k].largeOnly);
    push(L({ title: 'Field ' + (i + 1), items: () => keys.map((k) => ({ label: SN.face.FIELDS[k].name, kind: 'radio', value: work.f[i] === k, onOk: () => { work.f[i] = k; nav.pop(); } })) }));
  }

  // =================== Weitere Einstellungen (Kap. 4.4) ===================
  function additional() {
    push(L({
      title: 'ADDITIONAL SETTINGS',
      items: () => {
        const e = S.mode().extra;
        const W = { fresh: 'Fresh water', salt: 'Salt water', en13319: 'EN13319' };
        return [
          { label: 'GPS', sub: on(e.gps), kind: 'toggle', value: e.gps, set: (v) => { e.gps = v; if (!v) e.route = false; } },
          { label: 'Dive route', sub: on(e.route), kind: 'toggle', value: e.route, disabled: !e.gps, set: (v) => { e.route = v; } },
          { label: 'Dive start depth', sub: depthStr(e.startDepth, 1), onOk: () => {
            const vals = range(1.2, 3.0, 0.1, 1);
            push(new PickerScreen({ title: 'Dive start depth', final: 'check', cols: [{ values: vals, index: Math.max(0, vals.indexOf(e.startDepth)), unit: SN.U.depth(0).u, fmt: (v) => SN.U.depth(v, 1).v }], onDone: (v) => { e.startDepth = v[0]; nav.pop(); } }));
          } },
          { label: 'Dive end time', sub: e.endTime + ' min', onOk: () => {
            const vals = range(1, 10, 1);
            push(new PickerScreen({ title: 'Dive end time', final: 'check', cols: [{ values: vals, index: e.endTime - 1, unit: 'min' }], onDone: (v) => { e.endTime = v[0]; nav.pop(); } }));
          } },
          { label: 'Water type', sub: W[e.water], onOk: () => push(radioList('Water type', [['fresh', 'Fresh water'], ['salt', 'Salt water'], ['en13319', 'EN13319']], () => e.water, (v) => { e.water = v; })) },
          { label: 'Feeling', sub: on(e.feeling), kind: 'toggle', value: e.feeling, set: (v) => { e.feeling = v; } },
        ];
      },
    }));
  }

  // =================== Tauchplaner (Kap. 10) ===================
  function planner() {
    const m = S.mode();
    const g = S.gf(m);
    push(new InfoScreen({
      cls: 'plain',
      content: () => SN.ui.hints() + '<div class="hdr"><div class="hdr-t">SETTINGS SUMMARY</div></div><div class="grid2">' +
        kv('GF', g.lo + ' / ' + g.hi) + kv('Gases', S.usableGases(m).map(fmt.gasName).join(', ')) +
        kv('Safety stop', SAFETY.find((x) => x[0] === m.algo.safety)[1]) + kv('Altitude', altOpts()[m.algo.altitude][1]) +
        kv('Last deco stop', depthStr(m.algo.lastStop, 0)) + '</div>',
      onOk: () => push(L({
        title: 'DIVE TYPE',
        items: [
          { label: 'No deco', onOk: () => plannerInterval('nodeco') },
          { label: 'Deco', onOk: () => plannerInterval('deco') },
        ],
      })),
    }));
  }
  function kv(k, v) { return '<div class="kv"><div class="k">' + esc(t(k)) + '</div><div class="v">' + esc(v) + '</div></div>'; }
  function plannerInterval(type) {
    const since = S.lastDiveEnd ? (S.now() - S.lastDiveEnd) / 60000 : 0;
    const start = Math.ceil(since / 10) * 10;
    const vals = [];
    for (let v = Math.min(start, 2880); v <= 2880; v += 10) vals.push(v);
    push(new PickerScreen({
      title: 'SURFACE INTERVAL', cols: [{ values: vals, index: 0, fmt: (v) => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0') }],
      onDone: (v) => plannerDepth(type, v[0] - since),
    }));
  }
  function planTissues(extraMin) {
    const tt = S.tissues.clone();
    if (extraMin > 0) tt.load(S.env.psurf, 0, extraMin, { o2: 21, he: 0 });
    return tt;
  }
  function pctx() {
    const m = S.mode();
    const g = S.gf(m);
    return { m, env: { psurf: S.env.psurf, rho: S.waterRho(m) }, lo: g.lo / 100, hi: g.hi / 100, gas: S.activeGas(m), gases: S.usableGases(m), ps: S.algoSurf(m) };
  }
  function plannerDepth(type, extra) {
    const c = pctx();
    const tt = planTissues(extra);
    const ft = S.settings.units.depth === 'ft';
    const vals = ft ? range(10, 330, 5) : range(3, 100, 1);
    const toM = (v) => (ft ? v / 3.28084 : v);
    push(new PickerScreen({
      title: 'DEPTH', final: type === 'nodeco' ? 'check' : 'next',
      cols: [{ values: vals, index: vals.indexOf(ft ? 60 : 18), unit: ft ? 'ft' : 'm' }],
      footer: (v) => {
        const n = SN.Deco.ndl(tt, c.env, toM(v[0]), c.gas, c.hi, c.ps);
        const md = SN.U.depth(SN.Deco.mod(c.gas), 1);
        return '<span class="fk">NDL</span> ' + num(n >= 100 ? '>99' : n, 'min') + '<span class="sp"></span><span class="fk">MOD</span> ' + num(md.v, md.u);
      },
      onDone: (v) => (type === 'nodeco' ? noDecoPlan(tt, toM(v[0]), c) : bottomTime(tt, toM(v[0]), c)),
    }));
  }
  function noDecoPlan(tt, depth, c) {
    const row = (d) => {
      if (d <= 0) return '';
      const n = SN.Deco.ndl(tt, c.env, d, c.gas, c.hi, c.ps);
      const dd = SN.U.depth(d, 0);
      return '<div class="ndrow ' + (Math.abs(d - depth) < 0.01 ? 'cur' : '') + '"><span>' + num(dd.v, dd.u) + '</span><span>' + num(n >= 100 ? '>99' : n, 'min') + '</span><span>' + fmt.gasName(c.gas) + '</span></div>';
    };
    const n = SN.Deco.ndl(tt, c.env, depth, c.gas, c.hi, c.ps);
    const md = SN.U.depth(SN.Deco.mod(c.gas), 1);
    const dd = SN.U.depth(depth, 0);
    push(new InfoScreen({
      cls: 'tall',
      content: () => '<div class="hdr"><div class="hdr-t">NO DECO PLAN</div></div><div class="grid2">' +
        '<div class="kv"><div class="k">Depth</div><div class="v">' + num(dd.v, dd.u) + '</div></div><div class="kv"><div class="k">NDL</div><div class="v">' + num(n >= 100 ? '>99' : n, 'min') + '</div></div>' +
        '<div class="kv"><div class="k">Gas</div><div class="v">' + fmt.gasName(c.gas) + '</div></div><div class="kv"><div class="k">MOD</div><div class="v">' + num(md.v, md.u) + '</div></div></div>' +
        '<div class="ndl">' + [-10, -5, 0, 5, 10].map((x) => row(depth + x)).join('') + '</div><div class="donebtn">' + iconBox(I.check, 'green') + ' Done</div>',
      onOk: () => nav.popTo(2),
      onEnd: () => nav.popTo(2),
    }));
  }
  function bottomTime(tt, depth, c) {
    const vals = range(1, 180, 1);
    const calc = (bt) => {
      const x = tt.clone();
      const desc = depth / 10; // Abstieg 10 m/min (aus Screenshot "Deco plan": 36 m in 3'36)
      x.load(c.env.psurf, (SN.Deco.pAt(depth, c.env) - c.env.psurf) / desc, desc, c.gas);
      x.load(SN.Deco.pAt(depth, c.env), 0, bt, c.gas);
      const pl = SN.Deco.plan(x, depth, { env: c.env, gases: c.gases, gas: c.gas, gfLow: c.lo, gfHigh: c.hi, anchor: 0, lastStop: c.m.algo.lastStop, rate: 10, algoSurf: c.ps });
      return { pl, desc };
    };
    const n0 = SN.Deco.ndl(tt, c.env, depth, c.gas, c.hi, c.ps);
    push(new PickerScreen({
      title: 'BOTTOM TIME', final: 'check',
      cols: [{ values: vals, index: Math.min(24, vals.length - 1), unit: 'min' }],
      footer: (v) => {
        const { pl } = calc(v[0]);
        const ndlLeft = Math.max(0, n0 - v[0]);
        return '<span class="fk">NDL</span> ' + num(ndlLeft >= 100 ? '>99' : ndlLeft, 'min') + '<span class="sp"></span><span class="fk">TTS</span> ' + num(Math.ceil(pl.tts), 'min');
      },
      onDone: (v) => decoPlan(depth, v[0], calc(v[0]), n0, c),
    }));
  }
  function decoPlan(depth, bt, res, n0, c) {
    const { pl, desc } = res;
    const rows = [];
    const G0 = c.gas;
    const dRow = (cls, ic, d, tm, run, gas, txt) => rows.push('<div class="dprow"><span class="dpi ' + cls + '">' + ic + '</span><span class="dpd">' + num(SN.U.depth(d, 0).v, SN.U.depth(0).u) + '</span>' +
      (txt ? '<span class="dpx">' + esc(txt) + '</span>' : '<span class="dpt">' + tm + '</span><span class="dpr">' + run + '</span>') + '<span class="dpg">' + esc(fmt.gasName(gas)) + '</span></div>');
    const mm = (min) => fmt.mmss(Math.round(min * 60));
    dRow('desc', '↘', depth, '--', mm(desc), G0);
    let run = desc + bt;
    dRow('bot', '⤓', depth, mm(bt), mm(run), G0);
    // Aufstieg / Stopps / Gaswechsel
    const ev = [];
    pl.stops.forEach((s) => ev.push({ type: 'stop', depth: s.depth, time: s.time, gas: s.gas, run: s.run }));
    pl.segments.forEach((s) => ev.push({ type: 'switch', depth: s.depth, gas: s.gas, run: s.run - 0.0001 }));
    ev.sort((a, b) => a.run - b.run);
    let lastD = depth;
    let gasNow = G0;
    for (const e of ev) {
      if (e.depth < lastD) { dRow('asc', '↗', e.depth, '--', mm(run + e.run - (e.type === 'stop' ? e.time : 0)), gasNow); lastD = e.depth; }
      if (e.type === 'switch') { gasNow = e.gas; dRow('gas', '▮', e.depth, '', '', e.gas, 'Gas change'); }
      else dRow('stop', '⧗', e.depth, mm(e.time), mm(run + e.run), e.gas);
    }
    const total = run + pl.tts;
    dRow('surf', '≈', 0, '--', mm(total), gasNow);
    const decoT = pl.stops.reduce((a, s) => a + s.time, 0);
    // Profil
    const W = 600, H = 160;
    const maxD = Math.max(10, depth * 1.1);
    const X = (tm) => 20 + tm / total * (W - 40), Y = (d) => 10 + d / maxD * (H - 20);
    let path = 'M' + X(0) + ' ' + Y(0) + ' L' + X(desc) + ' ' + Y(depth) + ' L' + X(run) + ' ' + Y(depth);
    let tcur = run; let dcur = depth;
    for (const s of pl.stops) {
      const ta = run + s.run - s.time;
      path += ' L' + X(ta) + ' ' + Y(s.depth) + ' L' + X(run + s.run) + ' ' + Y(s.depth);
      tcur = run + s.run; dcur = s.depth;
    }
    path += ' L' + X(total) + ' ' + Y(0);
    const svg = '<svg class="prof" viewBox="0 0 ' + W + ' ' + H + '"><path d="' + path + ' L' + X(total) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(0) + 'Z" fill="#1b2a5a"/><path d="' + path + '" fill="none" stroke="#19e6c8" stroke-width="3"/></svg>';
    push(new InfoScreen({
      cls: 'tall',
      content: () => '<div class="hdr"><div class="hdr-t">DECO PLAN</div></div><div class="dplist">' + rows.join('') + '</div><div class="grid2">' +
        '<div class="kv"><div class="k">Total run time</div><div class="v">' + num(Math.ceil(total), 'min') + '</div></div><div class="kv"><div class="k">Total deco time</div><div class="v">' + num(Math.ceil(decoT), 'min') + '</div></div>' +
        '<div class="kv"><div class="k">Total NDL at ' + depthStr(depth, 0) + '</div><div class="v">' + num(n0 >= 100 ? '>99' : n0, 'min') + '</div></div></div>' + svg,
      onOk: () => nav.popTo(2),
    }));
  }

  // =================== Tauchmenü während des Tauchgangs ===================
  function diveMenu() {
    push(L({
      title: 'GASES',
      items: () => {
        const m = S.mode();
        const dv = SN.sim.dive;
        const sug = dv && dv.suggest;
        const list = S.usableGases(m).slice().sort((a, b) => (sug ? (b === sug) - (a === sug) : 0) || (b.state === 'active') - (a.state === 'active'));
        const its = list.map((g) => ({ html: gasRow(g), h: 118, cls: 'gas ' + g.state, onOk: () => { if (g.state !== 'active') SN.sim.switchGas(g); nav.root(); } }));
        if (sug) its.push({ label: 'Dismiss', icon: iconBox(I.x), onOk: () => { SN.sim.dismissSuggestion(); nav.root(); } });
        return its;
      },
    }));
  }

  // =================== Widgets (Nach-oben-Taste) ===================
  function widgets() {
    push(L({
      title: '',
      cls: 'widgets',
      items: () => {
        const env = S.env;
        const its = [
          { html: '<div class="wcard"><span class="ibox">' + I.sliders + '</span><div><div class="wt">' + esc(t('CONTROL PANEL')) + '</div><div class="wl">' + batIcon() + num(Math.round(env.battery), '%') + '<span class="wtime"><b>' + fmt.clock(S.now()) + '</b><small>' + fmt.date(S.now()) + '</small></span></div></div></div>', h: 96, onOk: controlPanel },
        ];
        if (env.updateAvailable) its.push({ html: '<div class="wcard"><div><div class="wt w">UPDATE AVAILABLE</div><div class="wg">Install now</div></div></div>', h: 80, onOk: softwareUpdate });
        const ll = S.logs[S.logs.length - 1];
        const nf = SN.sim.noFlyRemaining();
        its.push({ html: '<div class="wcard"><span class="ibox">' + I.hist + '</span><div><div class="wt">' + esc(t('DIVE HISTORY')) + '</div><div class="ws">' + (ll ? fmt.dateLong(ll.end) + ' · ' + fmt.mmss(ll.duration) + (nf ? ' · ✈ ' + noFlyStr(nf) + 'h' : '') : '- -') + '</div></div></div>', h: 84, onOk: diveHistory });
        its.push({ html: '<div class="wcard"><span class="ibox">' + I.map + '</span><div><div class="wt">' + esc(t('Map').toUpperCase()) + '</div><div class="ws">' + posStr() + '</div></div></div>', h: 84, onOk: mapWidget });
        its.push({ html: '<div class="wcard"><span class="ibox">' + I.cloud + '</span><div><div class="wt">' + esc(t('Weather').toUpperCase()) + '</div><div class="ws">' + (env.app ? SN.U.temp(env.weather.temp).v + SN.U.temp(0).u + ' · ' + env.weather.wind + ' m/s' : 'Sync with Suunto app') + '</div></div></div>', h: 84, onOk: weather });
        its.push({ html: '<div class="wcard"><span class="ibox">' + I.wave + '</span><div><div class="wt">' + esc(t('Tides').toUpperCase()) + '</div><div class="ws">' + (env.app ? env.tides.height.toFixed(1) + ' m · ▲ ' + env.tides.high.t : 'Sync with Suunto app') + '</div></div></div>', h: 84, onOk: tides });
        return its;
      },
    }));
  }
  function batIcon() { return '<span class="bat"><i style="height:' + Math.round(S.env.battery) + '%"></i></span>'; }
  function noFlyStr(sec) { const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }

  // =================== Systemsteuerung (Kap. 3) ===================
  function controlPanel() {
    push(L({
      title: 'CONTROL PANEL',
      cls: 'cp',
      top: () => '<div class="cptop">' + batIcon() + num(Math.round(S.env.battery), '%') + '<span class="wtime"><b>' + fmt.clock(S.now()) + '</b><small>' + fmt.date(S.now()) + '</small></span></div>',
      items: () => {
        const st = S.settings;
        const its = [
          { label: 'Flashlight', sub: on(st.flashlight), kind: 'toggle', value: st.flashlight, icon: iconBox(I.flash, st.flashlight ? 'yellow' : ''), set: (v) => { st.flashlight = v; } },
          { label: 'Button lock', sub: on(st.buttonLock), kind: 'toggle', value: st.buttonLock, icon: iconBox(st.buttonLock ? I.lock : I.unlock), set: (v) => { st.buttonLock = v; if (v) { toast('Buttons locked'); nav.root(); } } },
          { label: 'Brightness', sub: st.brightness === 'low' ? 'Low' : st.brightness === 'high' ? 'High' : 'Medium', icon: iconBox(I.sun), onOk: () => push(radioList('BRIGHTNESS', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], () => st.brightness, (v) => { st.brightness = v; }, false)) },
          { label: 'Airplane mode', sub: on(st.bt.airplane), kind: 'toggle', value: st.bt.airplane, icon: iconBox(I.plane), set: (v) => { st.bt.airplane = v; } },
          { label: 'Connectivity', icon: iconBox(I.bt), onOk: connectivity },
          { label: 'Device settings', icon: iconBox(I.gear), onOk: deviceSettings },
        ];
        if (S.env.updateAvailable) its.unshift({ html: '<div><div class="wt w">UPDATE AVAILABLE</div><div class="wg">Install now</div></div>', h: 70, onOk: softwareUpdate });
        return its;
      },
    }));
  }
  function softwareUpdate() {
    push(L({
      title: '',
      cls: 'upd',
      top: () => '<div class="updtop">' + I.update + ' Update available</div>',
      items: [
        { label: 'Install now', icon: iconBox(I.arrowR, 'green'), onOk: () => {
          nav.root();
          SN.app.reboot('Installing update…', () => { S.env.updateAvailable = false; });
        } },
        { label: 'Later', icon: iconBox(I.x), onOk: () => nav.pop() },
      ],
    }));
  }
  function connectivity() {
    push(L({
      title: 'CONNECTIVITY',
      items: () => {
        const bt = S.settings.bt;
        return [
          { label: 'Discovery', sub: on(bt.discovery), kind: 'toggle', value: bt.discovery, set: (v) => { bt.discovery = v; } },
          { label: 'Airplane mode', sub: on(bt.airplane), kind: 'toggle', value: bt.airplane, set: (v) => { bt.airplane = v; } },
          { label: 'Pair new device', onOk: () => {
            if (bt.airplane) { toast('Airplane mode'); return; } // Kap. 3.10.1: im Flugmodus nicht möglich
            push(L({
              title: 'SENSORS FOUND',
              items: () => S.env.sensorsNearby.filter((s) => !bt.sensors.find((x) => x.serial === s.serial)).map((s) => ({
                label: s.name, sub: s.serial, icon: iconBox(I.heart), onOk: () => { bt.sensors.push(Object.assign({}, s)); S.env.hrBeltOn = true; toast('Paired'); nav.pop(); },
              })),
            }));
          } },
          { label: 'Paired devices', sub: bt.sensors.length + '', onOk: () => push(L({
            title: 'PAIRED DEVICES',
            items: () => bt.sensors.map((s) => ({ label: s.name, sub: s.serial, icon: iconBox(I.heart), onOk: () => push(L({ title: s.name, items: [{ label: 'Remove', icon: iconBox(I.trash, 'red'), onOk: () => { bt.sensors.splice(bt.sensors.indexOf(s), 1); nav.popTo(nav.stack.length - 2); } }] })) })),
          })) },
        ];
      },
    }));
  }
  function deviceSettings() {
    push(L({
      title: 'DEVICE SETTINGS',
      items: () => {
        const st = S.settings;
        return [
          { label: 'Software update', sub: S.env.updateAvailable ? 'Update available' : 'Up to date', onOk: () => { if (S.env.updateAvailable) softwareUpdate(); } },
          { label: 'Units', sub: st.units.system === 'imperial' ? 'Imperial' : 'Metric', onOk: units },
          { label: 'Sounds', onOk: () => push(L({ title: 'SOUNDS', items: () => [
            { label: 'Tones', sub: on(st.sounds.tones), kind: 'toggle', value: st.sounds.tones, set: (v) => { st.sounds.tones = v; } },
            { label: 'Vibration', sub: on(st.sounds.vibration), kind: 'toggle', value: st.sounds.vibration, set: (v) => { st.sounds.vibration = v; } },
          ] })) },
          { label: 'Wear orientation', sub: st.orientation === 'left' ? 'Buttons left' : 'Buttons right', onOk: () => push(L({
            title: 'WEAR ORIENTATION', cls: 'wear',
            top: () => '<div class="wearimg ' + st.orientation + '"><span></span></div>',
            items: () => [['left', 'Buttons left'], ['right', 'Buttons right']].map(([k, l]) => ({ label: l, value: st.orientation === k, onOk: () => { st.orientation = k; SN.app.applyOrientation(); nav.pop(); } })),
          })) },
          { label: 'Language', sub: st.language === 'de' ? 'Deutsch' : 'English', onOk: () => push(radioList('LANGUAGE', [['en', 'English'], ['de', 'Deutsch']], () => st.language, (v) => { st.language = v; })) },
          { label: 'Device lock', sub: on(st.passcode.enabled), onOk: deviceLock },
          { label: 'Time/Date', sub: fmt.clock(S.now()), onOk: timeDate },
          { label: 'About', onOk: about },
          { label: 'Tissue reset', onOk: tissueReset },
          { label: 'Reset settings', onOk: () => push(confirm('Reset settings', 'All data on the device will be deleted.', 'Reset', () => SN.app.factoryReset())) },
        ];
      },
    }));
  }
  function units() {
    push(L({
      title: 'UNITS',
      items: () => {
        const u = S.settings.units;
        const sys = (v) => { u.system = v; if (v === 'metric') Object.assign(u, { depth: 'm', pressure: 'bar', temp: 'C', volume: 'l' }); else Object.assign(u, { depth: 'ft', pressure: 'psi', temp: 'F', volume: 'cuft' }); };
        return [
          { label: 'Metric', kind: 'radio', value: u.system === 'metric', onOk: () => sys('metric') },
          { label: 'Imperial', kind: 'radio', value: u.system === 'imperial', onOk: () => sys('imperial') },
          { kind: 'section', label: 'ADVANCED' },
          { label: 'Depth', sub: u.depth, onOk: () => { u.depth = u.depth === 'm' ? 'ft' : 'm'; } },
          { label: 'Tank pressure', sub: u.pressure, onOk: () => { u.pressure = u.pressure === 'bar' ? 'psi' : 'bar'; } },
          { label: 'Temperature', sub: '°' + u.temp, onOk: () => { u.temp = u.temp === 'C' ? 'F' : 'C'; } },
          { label: 'Gas volume', sub: u.volume === 'l' ? 'L' : 'cu ft', onOk: () => { u.volume = u.volume === 'l' ? 'cuft' : 'l'; } },
        ];
      },
    }));
  }
  function timeDate() {
    push(L({
      title: 'TIME/DATE',
      items: () => {
        const st = S.settings;
        const its = [
          { label: 'Automatic time update', sub: on(st.autoTime), kind: 'toggle', value: st.autoTime, set: (v) => { st.autoTime = v; } },
          { label: 'Time format', sub: st.timeFormat, onOk: () => push(radioList('Time format', [['24h', '24h'], ['12h', '12h']], () => st.timeFormat, (v) => { st.timeFormat = v; })) },
        ];
        if (!st.autoTime) its.push({ label: 'Time', sub: fmt.clock(S.now()), onOk: () => {
          const d = new Date(S.now());
          push(new PickerScreen({
            title: 'Time', final: 'check',
            cols: [{ values: range(0, 23, 1), index: d.getHours(), fmt: (v) => String(v).padStart(2, '0') }, { values: range(0, 59, 1), index: d.getMinutes(), fmt: (v) => String(v).padStart(2, '0') }],
            onDone: (v) => {
              const n = new Date(S.now()); const target = new Date(n); target.setHours(v[0], v[1], n.getSeconds());
              S.simOffset += target - n; nav.pop();
            },
          }));
        } });
        return its;
      },
    }));
  }
  function about() {
    push(new InfoScreen({
      content: () => '<div class="hdr"><div class="hdr-t">' + esc(t('ABOUT')) + '</div></div><div class="grid1">' +
        kv('Product', 'Suunto Nautic') + kv('Type', 'DW251') + kv('Software', 'Web-Emulator (kein Original-Firmware-Stand)') + '</div>',
    }));
  }
  function tissueReset() {
    push(new InfoScreen({
      cls: 'tissuereset',
      content: () => '<div class="cf"><div class="cf-ic warn">' + I.warn + '</div><div class="cf-t">TISSUE RESET</div><div class="cf-x">By resetting tissues you confirm that you understand the possible risks involved.<br><br>Tissue reset cannot be reversed.</div>' +
        '<div class="cf-b"><span class="ybtn">' + I.arrowR + '</span>Reset tissues</div></div>',
      onOk: () => {
        S.tissues.reset(S.env.psurf); S.cns = 0; S.otuDives = [];
        S.logs.forEach((l) => { l.noFly = 0; });
        S.save(); toast('Done'); nav.pop();
      },
    }));
  }

  // ---- Gerätesperre (Kap. 3.11) ----
  function deviceLock() {
    push(L({
      title: 'DEVICE LOCK',
      items: () => {
        const pc = S.settings.passcode;
        const its = [{ label: 'Use passcode', sub: on(pc.enabled), kind: 'toggle', value: pc.enabled, set: (v) => {
          if (v) setPasscode(() => { pc.enabled = true; });
          else push(new PasscodeScreen({ title: 'Enter passcode', onCode: (c) => { if (c === pc.code) { pc.enabled = false; pc.code = null; nav.pop(); toast('Done'); } else { nav.pop(); toast('Wrong passcode'); } } }));
        } }];
        if (pc.enabled) its.push({ label: 'Change passcode', onOk: () => setPasscode(() => {}) });
        return its;
      },
    }));
  }
  function setPasscode(after) {
    push(new PasscodeScreen({
      title: 'Set passcode',
      onCode: (c1) => {
        nav.pop();
        push(new PasscodeScreen({
          title: 'Confirm passcode',
          onCode: (c2) => {
            nav.pop();
            if (c1 === c2) { S.settings.passcode.code = c1; after(); S.save(); popup('Passcode set'); }
            else popup('Passcodes do not match. Try again.');
          },
        }));
      },
    }));
  }
  function popup(text) { SN.ui.showToast(esc(text), 2200); }

  /** 6-stelliger Code mit den Ziffern 1–4 = Tasten (1 oben links, 2 oben rechts, 3 unten links, 4 unten rechts) */
  class PasscodeScreen {
    constructor(o) { Object.assign(this, { code: '' }, o); }
    render() {
      let boxes = '';
      for (let i = 0; i < 6; i++) boxes += '<span class="pcd ' + (i < this.code.length ? 'f' : '') + '">' + (this.code[i] || '') + '</span>';
      return '<div class="scr passcode"><span class="pk k1">1</span><span class="pk k2">2</span><span class="pk k3">3</span><span class="pk k4">4</span>' +
        '<div class="pct">' + esc(this.title) + '</div><div class="pcb">' + boxes + '</div><div class="pch">Hold back button to delete</div></div>';
    }
    onButton(b, long) {
      if (long && b === 'back') { this.code = this.code.slice(0, -1); return true; }
      if (long) return true;
      const map = { up: '1', back: '2', down: '3', ok: '4' };
      this.code += map[b];
      if (this.code.length === 6) { const c = this.code; this.code = ''; this.onCode(c); }
      return true;
    }
  }

  // =================== Frühere Tauchgänge (Kap. 11) ===================
  function diveHistory() {
    push(L({
      title: 'DIVE HISTORY',
      cls: 'history',
      items: () => {
        const logs = S.logs;
        const ll = logs[logs.length - 1];
        const maxL = logs.reduce((a, b) => (!a || b.maxDepth > a.maxDepth ? b : a), null);
        const longL = logs.reduce((a, b) => (!a || b.duration > a.duration ? b : a), null);
        const total = logs.reduce((a, b) => a + b.duration, 0);
        const nf = SN.sim.noFlyRemaining();
        const st = ll ? fmt.surfTime((S.now() - ll.end) / 1000) : null;
        const md = maxL ? SN.U.depth(maxL.maxDepth, 1) : null;
        const stats = '<div class="hgrid">' +
          '<div><div class="k">Surface time</div><div class="v">' + (st ? num(st.v, st.u) : '- -') + '</div></div>' +
          '<div><div class="k">Total dives</div><div class="v">' + num('#' + logs.length) + '</div></div>' +
          '<div><div class="k">Max. depth</div><div class="v">' + (md ? num(md.v, md.u) : '- -') + '</div><div class="s">' + (maxL ? fmt.dateShort(maxL.end) : '') + '</div></div>' +
          '<div><div class="k">No-fly time</div><div class="v">' + (nf > 0 ? '<span class="plane">' + I.plane + '</span>' + num(noFlyStr(nf), 'h') : num('- -')) + '</div></div>' +
          '<div><div class="k">Longest dive</div><div class="v">' + (longL ? num(Math.floor(longL.duration / 3600) + ':' + String(Math.floor(longL.duration / 60) % 60).padStart(2, '0')) : '- -') + '</div><div class="s">' + (longL ? fmt.dateShort(longL.end).replace(/\//g, '.') : '') + '</div></div>' +
          '<div><div class="k">Total dive time</div><div class="v">' + num(Math.floor(total / 3600), 'h') + '</div></div></div>';
        const its = [{ html: stats, h: 330, chev: false, cls: 'nosel' }, { kind: 'section', label: 'DIVE LOG' }];
        logs.slice().reverse().forEach((lg) => {
          const d = SN.U.depth(lg.maxDepth, 1);
          its.push({ html: '<div class="logrow"><span class="ibox cyan">' + I.diver + '</span><div><div class="ld">' + fmt.dateLong(lg.start) + ', ' + fmt.clock(lg.start) + '</div><div class="lv">' + I.stopwatch + num(fmt.mmss(lg.duration)) + ' &nbsp; ' + I.depthI + num(d.v, d.u) + '</div></div>' + (lg.deviation ? '<span class="ldev">' + I.warn + '</span>' : '') + '</div>', h: 84, onOk: () => logDetail(lg) });
        });
        return its;
      },
    }));
  }
  function logDetail(lg) {
    const samples = lg.samples || [];
    const W = 600, H = 170;
    const maxD = Math.max(5, lg.maxDepth * 1.1);
    const tmax = Math.max(1, lg.duration);
    const pts = samples.map((s) => (20 + s.t / tmax * (W - 40)).toFixed(1) + ',' + (10 + s.d / maxD * (H - 20)).toFixed(1));
    const prof = '<svg class="prof" viewBox="0 0 ' + W + ' ' + H + '"><rect x="20" y="10" width="' + (W - 40) + '" height="' + (H - 20) + '" fill="#13214d"/><path d="M20 10 L' + pts.join(' L') + ' L' + (W - 20) + ' 10" fill="none" stroke="#19e6c8" stroke-width="3"/></svg>';
    const md = SN.U.depth(lg.maxDepth, 1), ad = SN.U.depth(lg.avgDepth, 1);
    const tmn = SN.U.temp(lg.tempMin), tmx = SN.U.temp(lg.tempMax);
    const gl = lg.gases.map((g) => '<div class="lgas"><div><b>' + esc(g.name) + '</b> <small>' + esc(t('Tank size')) + ' ' + tankSizeStr(g.tank) + '</small></div>' +
      (g.startP && g.startP.length ? '<div class="lgp">' + I.pod + ' ' + g.startP.map((p, i) => Math.round(p) + ' → ' + (g.endP[i] != null ? Math.round(g.endP[i]) : '- -')).join(' / ') + ' bar' + (g.avgRmv ? '<br><small>Avg. ' + g.avgRmv.toFixed(1) + ' L/min</small>' : '') + '</div>' : '') + '</div>').join('');
    const tis = '<div class="tis big"><div class="tisbars">' + (lg.tissues || []).map((c) => '<i class="' + (c.overM ? 'r' : c.overAmb ? 'y' : 'g') + '" style="width:' + Math.min(150, c.ratio * 100) / 150 * 100 + '%"></i>').join('') + '</div></div>';
    const s = new InfoScreen({
      cls: 'tall',
      content: () => (lg.deviation ? '<div class="devhdr">' + I.warn + ' ALGORITHM DEVIATION</div>' : '') +
        '<div class="sumtop"><div class="hdr-t">DIVE<br>SUMMARY</div><div class="sumdur">' + esc(fmt.durLog(lg.duration)) + '</div></div>' +
        '<div class="sec">Depth</div><div class="grid2">' + '<div class="kv"><div class="v">' + num(ad.v, ad.u) + '</div><div class="k2">Avg.</div></div><div class="kv"><div class="v">' + num(md.v, md.u) + '</div><div class="k2">Max.</div></div></div>' +
        '<div class="ptimes"><span>' + fmt.clock(lg.start) + '</span><span>' + fmt.clock(lg.end) + '</span></div>' + prof +
        '<div class="sec">Temperature</div><div class="grid2"><div class="kv"><div class="v">' + num(tmn.v, tmn.u) + '</div><div class="k2">Min.</div></div><div class="kv"><div class="v">' + num(tmx.v, tmx.u) + '</div><div class="k2">Max.</div></div></div>' +
        '<div class="band">GAS LIST</div>' + gl +
        '<div class="grid2">' + kv('Gradient factors', lg.algoOn === false ? 'Off' : lg.gf.lo + '/' + lg.gf.hi) + kv('CNS / OTU', lg.cns + '% / ' + lg.otu) +
        kv('Avg. heart rate', lg.hrAvg ? lg.hrAvg + ' bpm' : '- -') + kv('Surface time', lg.surfaceBefore != null ? fmt.surfTime(lg.surfaceBefore).v + fmt.surfTime(lg.surfaceBefore).u : '- -') +
        kv('Feeling', lg.feeling ? lg.feeling : '- -') + kv('Start / End', fmt.clock(lg.start) + ' – ' + fmt.clock(lg.end)) + '</div>' +
        '<div class="sec">Tissues</div>' + tis,
    });
    push(s);
  }
  function feeling(lg, then) {
    push(L({
      title: 'How was it?',
      items: ['Weak', 'Average', 'Good', 'Very good', 'Excellent'].map((f) => ({ label: f, onOk: () => { lg.feeling = f; S.save(); nav.pop(); then(); } })),
      onBack: () => { nav.pop(); then(); },
    }));
  }

  // =================== Karte (Kap. 12.1) ===================
  function posStr() {
    const { lat, lon } = S.env;
    const f = S.settings.nav.posFormat;
    const dms = (v, p, n) => {
      const a = Math.abs(v); const d = Math.floor(a); const mm = (a - d) * 60; const m = Math.floor(mm); const s = (mm - m) * 60;
      if (f === 'WGS84 Hd.d°') return a.toFixed(5) + '°' + (v >= 0 ? p : n);
      if (f === 'WGS84 Hd°m.m\'') return d + '°' + mm.toFixed(3) + '\'' + (v >= 0 ? p : n);
      return d + '°' + String(m).padStart(2, '0') + '\'' + s.toFixed(1).padStart(4, '0') + '"' + (v >= 0 ? p : n);
    };
    if (!/^WGS84/.test(f)) return esc(f) + ': n/a';
    return dms(lat, 'N', 'S') + ' ' + dms(lon, 'E', 'W');
  }
  const map = { zoom: 3, panX: 0, panY: 0, panning: false };
  const SCALES = ['50 m', '200 m', '1 km', '5 km', '20 km', '100 km'];
  function mapWidget() {
    const scr = {
      render() {
        const st = S.settings.nav.mapStyle;
        const cpass = !S.env.compassCal ? '<div class="cal sm"><div class="calic">' + I.infinity + '</div><div>Calibrate compass</div></div>' : '';
        return '<div class="scr mapw style-' + st.replace(/\s/g, '') + '">' + SN.ui.hints() +
          '<div class="mapl"><div class="mcomp">' + SN.face.fieldHTML('compass', 'large') + '</div>' + cpass + '<div class="mpos">' + posStr().replace(' ', '<br>') + '</div></div>' +
          '<div class="mapr"><svg viewBox="0 0 400 380" preserveAspectRatio="none"><g transform="translate(' + map.panX + ',' + map.panY + ') scale(' + (1 + (5 - map.zoom) * 0.25) + ')">' +
          '<rect x="-400" y="-400" width="1200" height="1200" class="water"/><path class="land" d="M-200 -200 L260 -200 C230 -40 330 40 250 140 C190 210 230 260 150 330 L-200 420Z"/>' +
          '<path class="land" d="M320 260 C360 240 420 280 420 320 L420 420 L300 420 C280 360 300 290 320 260Z"/><path class="cont" d="M-100 60 C40 20 120 90 180 40 M-120 160 C20 120 100 190 160 150"/></g>' +
          '<circle cx="200" cy="190" r="13" fill="#000"/><path d="M200 180 l7 16 -7 -4 -7 4z" fill="#fff" transform="rotate(' + S.env.heading + ' 200 190)"/></svg>' +
          '<div class="mscale">' + SCALES[map.zoom] + '</div>' + (map.panning ? '<div class="mpan">PAN</div>' : '') + '</div></div>';
      },
      onButton(b, long) {
        if (long) return false;
        if (map.panning) {
          if (b === 'up') map.panY += 30; else if (b === 'down') map.panY -= 30; else if (b === 'ok') map.panX -= 30; else if (b === 'back') map.panning = false;
          return true;
        }
        if (b === 'up') { map.zoom = Math.max(0, map.zoom - 1); return true; }
        if (b === 'down') { map.zoom = Math.min(SCALES.length - 1, map.zoom + 1); return true; }
        if (b === 'back') { nav.pop(); return true; }
        if (b === 'ok') { mapOptions(); return true; }
        return false;
      },
      onShow() { if (!S.env.compassCal) SN.ui.showToast('Calibrate compass', 2000); },
    };
    push(scr);
  }
  function mapOptions() {
    push(L({
      title: 'MAP OPTIONS',
      items: () => [
        { label: 'Map style', sub: S.settings.nav.mapStyle, onOk: () => push(radioList('Map style', [['Light', 'Light'], ['Dark', 'Dark'], ['High contrast', 'High contrast'], ['Winter', 'Winter']], () => S.settings.nav.mapStyle, (v) => { S.settings.nav.mapStyle = v; })) },
        { label: 'Pan map', onOk: () => { map.panning = true; nav.pop(); } },
        { label: 'Save position as POI', onOk: savePoi },
        { label: 'POIs', sub: S.settings.pois.length + '', onOk: poiList },
        { label: 'Navigation settings', onOk: navSettings },
      ],
    }));
  }
  const POI_TYPES = ['Start', 'End', 'Car', 'Parking', 'Home', 'Building', 'Hotel', 'Hostel', 'Accommodation', 'Sleeping spot', 'Camp', 'Camping', 'Campfire', 'Aid station', 'Emergency', 'Water point', 'Information', 'Restaurant', 'Food', 'Cafe', 'Cave', 'Mountain', 'Peak', 'Rock', 'Cliff', 'Avalanche', 'Valley', 'Hill', 'Road', 'Trail', 'River', 'Water', 'Waterfall', 'Coast', 'Lake', 'Kelp forest', 'Marine reserve', 'Coral reef', 'Big fish', 'Marine mammal', 'Wreck', 'Fishing spot', 'Beach', 'Forest', 'Meadow', 'Shore', 'Stand', 'Shot', 'Rub', 'Scrape', 'Big game', 'Small game', 'Bird', 'Tracks', 'Crossings', 'Danger', 'Geocache', 'Sight', 'Trailcam'];
  function savePoi() {
    push(new InfoScreen({
      content: () => '<div class="hdr"><div class="hdr-t">Save position as POI</div></div><div class="grid1">' + kv('Position', posStr()) + '</div><div class="donebtn">' + iconBox(I.check, 'green') + ' ' + esc(t('Save')) + '</div>',
      onOk: () => push(L({
        title: 'POI TYPE',
        items: POI_TYPES.map((ty) => ({ label: ty, onOk: () => {
          const n = S.settings.pois.filter((p) => p.type === ty).length + 1;
          S.settings.pois.push({ name: ty + ' ' + n, type: ty, created: S.now(), lat: S.env.lat, lon: S.env.lon, alt: 0 });
          S.save(); toast('Saved'); nav.popTo(nav.stack.length - 2);
        } })),
      })),
    }));
  }
  function poiList() {
    push(L({
      title: 'POIS',
      items: () => S.settings.pois.length ? S.settings.pois.map((p) => ({ label: p.name, sub: fmt.date(p.created), onOk: () => push(new InfoScreen({ content: () => '<div class="hdr"><div class="hdr-t">' + esc(p.name) + '</div></div><div class="grid1">' + kv('Type', p.type) + kv('Created', fmt.date(p.created) + ' ' + fmt.clock(p.created)) + kv('Latitude', p.lat.toFixed(5)) + kv('Longitude', p.lon.toFixed(5)) + kv('Altitude', p.alt + ' m') + '</div>' })) })) : [{ label: '- -', kind: 'info' }],
    }));
  }
  function navSettings() {
    push(L({
      title: 'NAVIGATION SETTINGS',
      items: () => {
        const nv = S.settings.nav;
        return [
          { label: 'Calibrate compass', onOk: () => push(new InfoScreen({ content: () => '<div class="cal big"><div class="calic">' + I.infinity + '</div><div>Rotate and tilt the device<br>in a figure-eight motion.</div></div>', onOk: () => { S.env.compassCal = true; toast('Done'); nav.pop(); }, onShow() {} })) },
          { label: 'Declination', sub: nv.declination.toFixed(1) + '°', onOk: () => {
            const vals = range(-30, 30, 0.5, 1);
            push(new PickerScreen({ title: 'Declination', final: 'check', cols: [{ values: vals, index: vals.indexOf(nv.declination), unit: '°', fmt: (v) => v.toFixed(1) }], onDone: (v) => { nv.declination = v[0]; nav.pop(); } }));
          } },
          { label: 'Compass unit', sub: nv.compassUnit === 'mil' ? 'Mils' : 'Degrees', onOk: () => push(radioList('Compass unit', [['deg', 'Degrees'], ['mil', 'Mils']], () => nv.compassUnit, (v) => { nv.compassUnit = v; })) },
          { label: 'Position format', sub: nv.posFormat, onOk: () => push(radioList('Position format', ['WGS84 Hd.d°', 'WGS84 Hd°m.m\'', 'WGS84 Hd°m\'s.s', 'UTM', 'MGRS', 'BNG (British)', 'ETRS-TM35FIN (Finnish)', 'KKJ (Finnish)', 'IG (Irish)', 'RT90 (Swedish)', 'SWEREF 99 TM (Swedish)', 'CH1903 (Swiss)', 'UTM NAD27 (Alaska)', 'UTM NAD27 Conus', 'UTM NAD83', 'NZTM2000 (New Zealand)'].map((x) => [x, x]), () => nv.posFormat, (v) => { nv.posFormat = v; })) },
        ];
      },
    }));
  }

  // =================== Wetter & Gezeiten (Kap. 12.3, 12.4) ===================
  function weather() {
    const w = S.env.weather;
    push(new InfoScreen({
      cls: 'tall',
      content: () => !S.env.app ? '<div class="hdr"><div class="hdr-t">WEATHER</div></div><div class="nodata">Sync with Suunto app</div>' :
        '<div class="hdr"><div class="hdr-t">WEATHER</div></div><div class="wbig">' + I.cloud + num(SN.U.temp(w.temp).v, SN.U.temp(0).u) + '</div><div class="grid2">' +
        kv('Wind', w.wind + ' m/s ' + ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(w.windDir / 45) % 8]) + kv('Gusts', w.gust + ' m/s') + kv('Humidity', w.hum + ' %') + kv('Precipitation', w.rain + ' mm') +
        kv('Sunrise', w.sunrise) + kv('Sunset', w.sunset) + kv('Moon phase', w.moon) + '</div><div class="sec">Forecast</div><div class="fc">' +
        w.forecast.map((x, i) => '<div><small>+' + (i + 1) * 3 + 'h</small><b>' + SN.U.temp(x).v + '°</b></div>').join('') + '</div>',
    }));
  }
  function tides() {
    const td = S.env.tides;
    push(new InfoScreen({
      cls: 'tall',
      content: () => {
        if (!S.env.app) return '<div class="hdr"><div class="hdr-t">TIDES</div></div><div class="nodata">Sync with Suunto app</div>';
        let path = '';
        for (let h = 0; h <= 24; h += 0.5) path += (h ? ' L' : 'M') + (20 + h * 23) + ' ' + (80 - Math.sin((h - 2) / 12.42 * 2 * Math.PI) * 50);
        return '<div class="hdr"><div class="hdr-t">TIDES</div></div><div class="wbig">' + I.wave + num(td.height.toFixed(1), 'm') + '</div><div class="grid2">' +
          kv('High tide', td.high.t + ' · ' + td.high.h + ' m') + kv('Low tide', td.low.t + ' · ' + td.low.h + ' m') + kv('Wave height', td.wave + ' m') + kv('Moon phase', td.moon) + '</div>' +
          '<div class="sec">24 h</div><svg class="prof" viewBox="0 0 600 160"><path d="' + path + '" fill="none" stroke="#19e6c8" stroke-width="3"/></svg><div class="grid1">' + kv('Position', posStr()) + '</div>';
      },
    }));
  }

  // =================== Ersteinrichtung (Kap. 2) ===================
  function setupWizard(done) {
    const step3 = () => push(L({
      title: 'UNITS',
      items: [
        { label: 'Metric', onOk: () => { Object.assign(S.settings.units, { system: 'metric', depth: 'm', pressure: 'bar', temp: 'C', volume: 'l' }); step4(); } },
        { label: 'Imperial', onOk: () => { Object.assign(S.settings.units, { system: 'imperial', depth: 'ft', pressure: 'psi', temp: 'F', volume: 'cuft' }); step4(); } },
      ],
    }));
    const step4 = () => push(L({
      title: 'Time format',
      items: [['24h', '24h'], ['12h', '12h']].map(([k, l]) => ({ label: l, onOk: () => { S.settings.timeFormat = k; S.settings.setupDone = true; S.save(); done(); } })),
    }));
    const warn = () => push(new InfoScreen({
      cls: 'tall',
      content: () => '<div class="cf"><div class="cf-ic warn">' + I.warn + '</div><div class="cf-t">WARNING</div><div class="cf-x left">' +
        'Dive computers are for trained divers only. Any computer can fail. Always use backup instruments and dive with a buddy.<br><br>' +
        'Read the printed quick guide and the online user guide of your dive computer.<br><br>' +
        '<small>(Gerätetext im Handbuch nicht abgedruckt – sinngemäß aus Kap. 1.1 übernommen)</small></div>' +
        '<div class="cf-b"><span class="ybtn">' + I.check + '</span>I understand</div></div>',
      onOk: step3,
      onBack: () => {},
    }));
    const lang = () => push(L({
      title: 'LANGUAGE', cls: 'lang',
      items: [['en', 'English'], ['de', 'Deutsch']].map(([k, l]) => ({ label: l, onOk: () => { S.settings.language = k; warn(); } })),
      onBack: () => {},
    }));
    push(new InfoScreen({
      cls: 'hello',
      content: () => '<div class="hello"><div class="hic">' + I.diver + '</div><div>Hello there!<br>Press the button to get started.</div><div class="harr">▾</div></div>',
      onOk: lang, onBack: () => {},
    }));
  }

  SN.screens = { diveSettings, diveMenu, widgets, controlPanel, deviceSettings, gases, logDetail, feeling, setupWizard, PasscodeScreen, mapWidget, softwareUpdate, diveHistory };
})(typeof window !== 'undefined' ? window : globalThis);
