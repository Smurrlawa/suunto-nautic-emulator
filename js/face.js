/* Haupt-Display (Kap. 4.1, 4.5, 4.6, 9) – Layout nach den Screenshots des Handbuchs */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});
  const S = SN.state;
  const I = SN.ui.I;
  const t = (s) => SN.t(s);
  const esc = SN.esc;

  // ---- Kompass & Stoppuhr (Kap. 9.3, 9.4) ----
  const compass = { bearing: null };
  const stopwatch = { running: false, acc: 0, since: 0 };
  function swValue() { return stopwatch.acc + (stopwatch.running ? (S.now() - stopwatch.since) / 1000 : 0); }

  function num(v, u, cls) {
    const s = String(v);
    const m = s.match(/^(-?[>]?\d+)(\.\d+)?(.*)$/);
    let h;
    if (m && m[2]) h = '<span class="ni">' + esc(m[1]) + '</span><span class="nd">' + esc(m[2]) + '</span>' + esc(m[3]);
    else h = esc(s);
    h = h.replace(/\u2032/g, '<span class="pr">\u2032</span>');
    return '<span class="num ' + (cls || '') + '">' + h + (u ? '<span class="u">' + esc(u) + '</span>' : '') + '</span>';
  }
  function d1(m) { const x = SN.U.depth(m, 1); return num(x.v, x.u); }

  function cell(cls, x, y, w, h, inner, lvl) {
    return '<div class="cell ' + cls + (lvl ? ' lv-' + lvl : '') + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px">' + inner + '</div>';
  }

  // ---- Felder des Umschaltfensters ----
  const FIELDS = {
    maxDepth: { label: 'MAX DEPTH', name: 'Max depth' },
    clock: { label: 'TIME', name: 'Time' },
    tankPressure: { label: 'TANK PRESSURE', name: 'Tank pressure' },
    gasConsumption: { label: 'GAS CONSUMPTION', name: 'Gas consumption' },
    gasTime: { label: 'GAS TIME', name: 'Gas time' },
    tts: { label: 'TIME TO SURFACE', name: 'Time to surface' },
    ppo2Mod: { label: 'ppO₂ / MOD', name: 'ppO2 / MOD' },
    avgDepth: { label: 'AVG. DEPTH', name: 'Average depth' },
    gf: { label: 'GRADIENT FACTORS', name: 'Gradient factors' },
    gf99: { label: 'GF99 / SURF. GF', name: 'GF99 / Surf. GF' },
    contingency: { label: 'Δ+5 / @5', name: 'Contingency Δ+5 / @5' },
    ascentSpeed: { label: 'ASCENT SPEED', name: 'Ascent speed' },
    tissues: { label: 'TISSUES', name: 'Tissues', largeOnly: true },
    ceiling: { label: 'CEILING', name: 'Ceiling' },
    activeGas: { label: 'ACTIVE GAS', name: 'Active gas' },
    otuCns: { label: 'OTU / CNS', name: 'OTU CNS' },
    compass: { label: 'COMPASS', name: 'Compass', largeOnly: true },
    stopwatch: { label: 'STOPWATCH', name: 'Stopwatch', largeOnly: true },
  };

  function lab(s) { return '<div class="flab">' + s + '</div>'; }

  function bottleBar(p, start, vertical) {
    // rot = < 50 bar, gelb = bis 100 bar (Annahme), blau = Füllstand, schraffiert = leer
    const max = Math.max(200, start || 0, p || 0);
    const pct = (x) => Math.max(0, Math.min(100, (x / max) * 100));
    const fill = pct(p);
    const r = pct(Math.min(p, 50)), y = pct(Math.min(p, 100)) - r;
    if (vertical) {
      return '<div class="bbar v"><i class="hatch"></i><i class="b" style="height:' + fill + '%"></i><i class="y" style="height:' + (r + Math.max(0, y)) + '%"></i><i class="r" style="height:' + r + '%"></i></div>';
    }
    return '<div class="bbar h"><i class="hatch"></i><i class="b" style="width:' + fill + '%"></i><i class="y" style="width:' + (r + Math.max(0, y)) + '%"></i><i class="r" style="width:' + r + '%"></i></div>';
  }

  function tankField(size, lvl) {
    const m = S.mode();
    const gas = S.activeGas(m);
    const pods = SN.sim.podsFor(gas);
    const L = lab(t('TANK PRESSURE'));
    if (!pods.length) return L + '<div class="fval small">' + esc(t('No tank POD')) + '</div>';
    const dv = SN.sim.dive;
    const st = dv && dv.gasUse[gas.id] ? dv.gasUse[gas.id].start : [];
    if (pods.length === 1) {
      const p = pods[0];
      if (!p.data) return L + '<div class="fval">' + num('- -', SN.U.press(0).u) + '</div>';
      const pr = SN.U.press(p.pressure);
      return L + '<div class="tankrow">' + num(pr.v, pr.u) + bottleBar(p.pressure, st[0], true) + '</div>';
    }
    return L + pods.map((p, i) => {
      if (!p.data) return '<div class="podrow">' + num('- -', 'bar') + '<span class="podn">' + I.pod + (p.slot + 1) + '</span></div>';
      const pr = SN.U.press(p.pressure);
      return '<div class="podrow">' + num(pr.v, pr.u) + '<span class="podn">' + I.pod + (p.slot + 1) + '</span>' + bottleBar(p.pressure, st[i], false) + '</div>';
    }).join('');
  }

  function twoCol(l1, v1, l2, v2, lv1, lv2) {
    return '<div class="two"><div class="half ' + (lv1 ? 'lv-' + lv1 : '') + '">' + lab(l1) + '<div class="fval">' + v1 + '</div></div>' +
      '<div class="half ' + (lv2 ? 'lv-' + lv2 : '') + '">' + lab(l2) + '<div class="fval">' + v2 + '</div></div></div>';
  }

  function fieldHTML(key, size) {
    const l = SN.sim.live, dv = SN.sim.dive, m = S.mode();
    const gas = S.activeGas(m);
    const fl = SN.alarms.fieldLevel;
    switch (key) {
      case 'maxDepth': return lab('MAX DEPTH') + '<div class="fval">' + d1(dv ? dv.maxDepth : lastLog() ? lastLog().maxDepth : 0).replace('class="num', 'class="num') + '</div>';
      case 'clock': return lab('TIME') + '<div class="fval">' + num(SN.fmt.clock(S.now())) + '</div>';
      case 'tankPressure': return tankField(size);
      case 'gasConsumption': {
        const v = l.rmv != null ? SN.U.vol(l.rmv) : { v: '- -', u: SN.U.vol(1).u };
        return lab('GAS CONSUMPTION') + '<div class="fval">' + num(v.v, v.u) + '</div>';
      }
      case 'gasTime': {
        const v = l.gasTime != null ? Math.floor(l.gasTime / 60) + ':' + String(Math.floor(l.gasTime % 60)).padStart(2, '0') : '- -';
        return lab('GAS TIME') + '<div class="fval">' + num(v) + '</div>';
      }
      case 'tts': return lab('TIME TO SURFACE') + '<div class="fval">' + num(m.algo.enabled ? Math.ceil(l.tts) : '- -', 'min') + '</div>';
      case 'ppo2Mod': {
        const md = SN.U.depth(SN.Deco.mod(gas), 1);
        const lv = fl('ppo2');
        return twoCol('ppO₂', num(l.ppo2.toFixed(1)), 'MOD', num(md.v, md.u), lv, null);
      }
      case 'avgDepth': {
        const a = dv && dv.depthTime ? dv.depthSum / dv.depthTime : 0;
        const x = SN.U.depth(a, 0);
        return lab('AVG. DEPTH') + '<div class="fval">' + num(x.v, x.u) + '</div>';
      }
      case 'gf': { const g = S.gf(m); return lab('GRADIENT FACTORS') + '<div class="fval">' + num(g.lo + '/' + g.hi) + '</div>'; }
      case 'gf99': {
        const g = S.gf(m);
        const g99 = l.gf99 < 0 ? '- -' : Math.round(l.gf99);
        const lv1 = l.gf99 >= 100 ? 'warning' : l.gf99 > g.hi ? 'caution' : null;
        const lv2 = l.gf99 >= 100 ? 'warning' : l.gf99 > g.hi ? 'caution' : null;
        return twoCol('GF99', num(g99, '%'), 'SURF. GF', num(Math.max(0, Math.round(l.surfGF)), '%'), lv1, lv2);
      }
      case 'contingency': return twoCol('Δ+5', num(Math.round(l.delta5) + '′'), '@5', num(Math.ceil(l.at5) + '′'));
      case 'ascentSpeed': {
        const v = SN.state.settings.units.depth === 'ft' ? Math.max(0, Math.round(l.ascRate * 3.28)) : Math.max(0, Math.round(l.ascRate));
        return lab('ASCENT SPEED') + '<div class="fval">' + num(v, SN.state.settings.units.depth === 'ft' ? 'ft/min' : 'm/min') + '</div>';
      }
      case 'ceiling': { const x = SN.U.depth(l.inDeco ? l.deko : 0, 1); return lab('CEILING') + '<div class="fval">' + num(x.v, x.u) + '</div>'; }
      case 'activeGas': return lab('ACTIVE GAS') + '<div class="fval gas">' + esc(SN.fmt.gasName(gas)) + '</div>';
      case 'otuCns': {
        const otu = Math.ceil(SN.sim.dailyOTU());
        const cns = Math.ceil(S.cns);
        return twoCol('OTU', num(otu), 'CNS', num(cns, '%'), fl('otu'), fl('cns'));
      }
      case 'tissues': return tissuesHTML();
      case 'compass': return compassHTML(size);
      case 'stopwatch': {
        const v = swValue();
        return lab('STOPWATCH') + '<div class="fval sw">' + num(SN.fmt.mmss(v)) + '</div><div class="swic">' + (stopwatch.running ? I.pause : I.play) + '</div>';
      }
    }
    return '';
  }

  function tissuesHTML() {
    const ch = S.tissues.chart(SN.sim.live.pamb);
    const bars = ch.map((c) => {
      const w = Math.min(150, c.ratio * 100) / 150 * 100;
      const col = c.overM ? 'r' : c.overAmb ? 'y' : 'g';
      return '<i class="' + col + '" style="width:' + w + '%"></i>';
    }).join('');
    return lab('TISSUES') + '<div class="tis"><div class="tisbars">' + bars + '</div><div class="tisgrid"><s style="left:33.3%"></s><s style="left:66.6%"></s><s style="left:100%"></s></div>' +
      '<div class="tisax"><span>0%</span><span>50</span><span>100</span><span>150</span></div></div>';
  }

  function compassHTML(size) {
    const env = S.env;
    const R = size === 'large' ? 112 : 60;
    const cx = 128, cy = size === 'large' ? 144 : 70;
    const h = ((env.heading + S.settings.nav.declination) % 360 + 360) % 360;
    if (!env.compassCal) {
      return '<div class="cal"><div class="calic">' + I.infinity + '</div><div>Calibrate<br>compass</div></div>' + ring(cx, cy, R, h, true);
    }
    const mils = S.settings.nav.compassUnit === 'mil';
    const val = mils ? Math.round(h * 6400 / 360) : Math.round(h) + '°';
    let brg = '';
    if (compass.bearing != null) brg = '<div class="brg">' + (mils ? Math.round(compass.bearing * 6400 / 360) : Math.round(compass.bearing) + '°') + '</div>';
    return ring(cx, cy, R, h, false) + '<div class="hdg' + (compass.bearing != null ? ' wb' : '') + '">' + val + '</div>' + brg;
  }
  function ring(cx, cy, R, h, dim) {
    let s = '<svg class="ring" viewBox="0 0 256 288" width="256" height="288">';
    s += '<line x1="' + cx + '" y1="' + (cy - R - 14) + '" x2="' + cx + '" y2="' + (cy - R + 18) + '" stroke="#777" stroke-width="1.5"/>';
    s += '<line x1="' + cx + '" y1="' + (cy + R - 18) + '" x2="' + cx + '" y2="' + (cy + R + 14) + '" stroke="#777" stroke-width="1.5"/>';
    s += '<g transform="rotate(' + (-h) + ' ' + cx + ' ' + cy + ')">';
    for (let a = 0; a < 360; a += 5) {
      const long = a % 30 === 0;
      const r1 = R - (long ? 12 : 6);
      const rad = a * Math.PI / 180;
      s += '<line x1="' + (cx + Math.sin(rad) * r1) + '" y1="' + (cy - Math.cos(rad) * r1) + '" x2="' + (cx + Math.sin(rad) * R) + '" y2="' + (cy - Math.cos(rad) * R) + '" stroke="#ddd" stroke-width="' + (long ? 2.2 : 1.4) + '"/>';
    }
    const L = [['E', 90], ['S', 180], ['W', 270]];
    for (const [c, a] of L) {
      const rad = a * Math.PI / 180, r = R - 24;
      s += '<text x="' + (cx + Math.sin(rad) * r) + '" y="' + (cy - Math.cos(rad) * r + 7) + '" fill="#fff" font-size="20" text-anchor="middle" transform="rotate(' + a + ' ' + (cx + Math.sin(rad) * r) + ' ' + (cy - Math.cos(rad) * r) + ')">' + c + '</text>';
    }
    s += '<path d="M' + cx + ' ' + (cy - R - 2) + 'l-9 -14h18z" fill="#ff3864" transform="rotate(10 ' + cx + ' ' + cy + ') rotate(-10 ' + cx + ' ' + cy + ')"/>';
    if (compass.bearing != null && !dim) {
      const b = compass.bearing;
      s += '<g transform="rotate(' + b + ' ' + cx + ' ' + cy + ')"><path d="M' + cx + ' ' + (cy - R + 4) + 'l-9 -16h18z" fill="#ffd400"/></g>';
      s += '<g transform="rotate(' + (b + 180) + ' ' + cx + ' ' + cy + ')"><rect x="' + (cx - 7) + '" y="' + (cy - R - 3) + '" width="14" height="6" fill="#ff8a00"/></g>';
    }
    s += '</g></svg>';
    return s;
  }

  function lastLog() { return S.logs[S.logs.length - 1]; }

  function switchWindow() {
    const m = S.mode();
    const to = SN.alarms.takeover();
    if (to && SN.sim.dive) return takeoverHTML(to);
    const v = m.views[m.viewIndex % m.views.length];
    if (!v) return cell('sw', 432, 0, 256, 288, '');
    if (v.type === 'large') return cell('sw large f-' + v.f[0], 432, 0, 256, 288, fieldHTML(v.f[0], 'large'), lvFor(v.f[0]));
    return cell('sw f-' + v.f[0], 432, 0, 256, 141, fieldHTML(v.f[0], 'half'), lvFor(v.f[0])) +
      cell('sw f-' + v.f[1], 432, 147, 256, 141, fieldHTML(v.f[1], 'half'), lvFor(v.f[1]));
  }
  function lvFor(key) {
    if (key === 'tankPressure') return SN.alarms.fieldLevel('tank');
    return null;
  }

  function takeoverHTML(def) {
    const l = SN.sim.live, dv = SN.sim.dive, m = S.mode();
    const lvl = def.level;
    let inner = '';
    if (def.takeover === 'deviation') {
      inner = '<div class="to-warn">' + I.warn + '<span class="stripes"></span></div><div class="to-txt">ALGORITHM<br>DEVIATION!' +
        (l.above === 'broken' ? '<br><br>SURPASSED THE<br>DECO CEILING' : '') + '</div>';
    } else if (def.takeover === 'gasswitch') {
      inner = '<div class="to-mid"><div class="to-l">SWITCH GAS</div><div class="to-v">' + esc(SN.fmt.gasName(dv.suggest || S.activeGas(m))) + '</div></div>';
    } else if (def.takeover === 'tank') {
      const gas = S.activeGas(m);
      const pods = SN.sim.podsFor(gas).filter((p) => p.data);
      const p = pods.length ? Math.min(...pods.map((x) => x.pressure)) : 0;
      const pr = SN.U.press(p);
      inner = '<div class="flab">TANK PRESSURE</div>' + (lvl === 'warning' ? '<div class="to-warn sm">' + I.warn + '<span class="stripes"></span></div>' : '') +
        '<div class="to-tank">' + num(pr.v, pr.u) + '<span class="bottle"><i style="height:' + Math.min(100, p / 2) + '%"></i></span></div>';
    } else if (def.takeover === 'sidemount') {
      const gas = S.activeGas(m);
      const pods = SN.sim.podsFor(gas).filter((p) => p.data);
      const diff = pods.length > 1 ? Math.abs(pods[0].pressure - pods[1].pressure) : 0;
      const pr = SN.U.press(diff);
      inner = '<div class="to-mid"><div class="to-l">SIDEMOUNT</div><div class="to-v">' + num(pr.v, pr.u) + '</div></div>';
    } else if (def.takeover === 'gastime') {
      inner = '<div class="to-mid"><div class="to-l">GAS TIME</div><div class="to-v">' + num(Math.floor((l.gasTime || 0) / 60) + ':' + String(Math.floor((l.gasTime || 0) % 60)).padStart(2, '0')) + '</div></div>';
    }
    return cell('sw takeover', 432, 0, 256, 288, inner, lvl);
  }

  // ---- Aufstiegsgeschwindigkeit (Kap. 4.5) ----
  function ascentBar() {
    const l = SN.sim.live, dv = SN.sim.dive;
    const r = dv ? l.ascRate : 0;
    const fast = l.ascFastSince != null && dv && dv.runtime - l.ascFastSince >= 5;
    let n = 0, col = 'gray';
    // ein Balkenschritt = 2 m/min; grau < 2, grün bis 8, gelb > 8, rot > 10 m/min (Kap. 4.5, Abbildung)
    if (r >= 0.5) {
      if (r < 2) { n = 1; col = 'gray'; }
      else if (r <= 8) { n = Math.min(3, Math.floor(r / 2)); col = 'green'; }
      else if (r <= 10) { n = 4; col = 'yellow'; }
      else { n = 5; col = 'red'; }
    }
    let segs = '';
    for (let i = 4; i >= 0; i--) {
      if (i < n) segs += '<i class="chevr ' + col + '"><svg viewBox="0 0 40 22"><path d="M5 18L20 5l15 13" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></i>';
      else segs += '<i class="seg"></i>';
    }
    return cell('asc' + (fast ? ' fast' : ''), 354, 0, 72, 152, '<div class="segs">' + segs + '</div>');
  }

  // ---- Dekofeld ----
  function decoCell(surface) {
    const l = SN.sim.live, m = S.mode();
    const lv = SN.alarms.fieldLevel('deco');
    if (!m.algo.enabled) return cell('deco', 256, 158, 170, 130, lab('NO DECO') + '<div class="dval">' + num('- -') + '</div>');
    const g = S.gf(m);
    // vertikaler Balken: Bedeutung im Handbuch nicht erklärt -> hier Oberflächen-GF relativ zu GF High (Annahme)
    let bar;
    if (l.inDeco) {
      const f = Math.min(100, Math.max(8, (l.surfGF - g.hi) / Math.max(1, 100 - g.hi) * 100));
      bar = '<div class="nbar deco"><i class="hatch"></i><i class="o" style="height:' + f + '%"></i></div>';
    } else {
      const f = Math.min(100, Math.max(6, 100 - Math.max(0, l.surfGF) / g.hi * 100));
      bar = '<div class="nbar"><i class="hatch"></i><i class="g" style="height:' + f + '%"></i><i class="o"></i></div>';
    }
    const ndlTxt = l.ndl >= 100 ? '>99′' : l.ndl + '′';
    if (l.inDeco) {
      return cell('deco', 256, 158, 170, 130, '<div class="dtag">DECO</div><div class="dval">' + num(Math.ceil(l.tts) + '′') + '</div>' + bar, lv);
    }
    if (m.decoField === 'ndltts' && !surface) {
      return cell('deco ndltts', 256, 158, 170, 130,
        '<div class="nt"><span class="g">NDL</span>' + num(ndlTxt) + '</div><div class="nt"><span class="y">TTS</span>' + num(String(Math.ceil(l.tts)).padStart(2, '0') + '′') + '</div>' + bar, lv);
    }
    return cell('deco', 256, 158, 170, 130, '<div class="flab green">NO DECO</div><div class="dval">' + num(ndlTxt) + '</div>' + bar, lv);
  }

  // ---- Stoppbereich (unten links) ----
  function stopCell() {
    const l = SN.sim.live, dv = SN.sim.dive, m = S.mode();
    const sf = dv.safety;
    const W = 426;
    const x = (v) => SN.U.depth(v, 1);
    if (dv.surfacedAt != null) {
      const st = SN.fmt.surfTime(dv.runtime - dv.surfacedAt);
      return cell('stop', 0, 294, W, 86, '<div class="sv">' + num(st.v, st.u) + '</div><div class="sl">SURFACE TIME</div>');
    }
    if (m.algo.enabled && l.inDeco) {
      if (m.algo.profile === 'stepped') {
        const dd = SN.U.depth(l.stopDepth, 0);
        const tcls = l.above === 'broken' ? 'lv-warning pill' : l.above === 'reserve' ? 'lv-caution pill' : l.inWindow ? 'beige pill' : '';
        return cell('stop', 0, 294, W, 86, '<div class="sv">' + num(dd.v, dd.u) + '</div><div class="st ' + tcls + '">' + num(Math.ceil(l.stopTime) + '′') + '</div><div class="sl r">STOP</div>');
      }
      const lv = l.above === 'broken' ? 'warning' : l.above === 'reserve' ? 'caution' : l.inWindow ? 'beige' : null;
      const c = x(Math.max(l.deko, 0));
      return cell('stop', 0, 294, W, 86, '<div class="sv">' + num(c.v, c.u) + '</div><div class="sl">CEILING</div>', lv);
    }
    if (sf.required && sf.done) {
      return cell('stop', 0, 294, W, 86, '<div class="done">' + esc(t('STOP DONE')) + '</div>');
    }
    if (sf.required) {
      if (sf.started) {
        const lv = SN.alarms.fieldLevel('stop');
        const pill = lv === 'caution' ? 'lv-caution' : (l.depth >= 2.4 && l.depth <= 6) ? 'beige' : 'plain';
        return cell('stop', 0, 294, W, 86, '<div class="st big pill ' + pill + '">' + num(SN.fmt.mmss(sf.remaining)) + '</div><div class="sl">' + esc(t('SAFETY STOP')) + '</div>');
      }
      return cell('stop', 0, 294, W, 86, '<div class="sv">' + num(x(3).v, x(3).u) + '</div><div class="sl">' + esc(t('SAFETY STOP')) + '</div>');
    }
    return cell('stop', 0, 294, W, 86, '');
  }

  // Pfeile neben der Tiefe (Kap. 8.3, 9.1, 9.2)
  function depthIcon() {
    const l = SN.sim.live, dv = SN.sim.dive, m = S.mode();
    if (!dv || !m.algo.enabled) return '';
    if (l.inDeco) {
      if (l.above === 'broken') return '<div class="dic red"><svg viewBox="0 0 24 48"><path d="M4 6h16L12 20zM4 26h16L12 40z" fill="#ff2626"/></svg></div>';
      if (l.above === 'reserve') return '<div class="dic yel"><svg viewBox="0 0 24 48"><path d="M4 14h16L12 32z" fill="#000"/></svg></div>';
      if (l.inWindow) return '<div class="dic win"><svg viewBox="0 0 24 48"><path d="M4 5h16L12 22zM4 43h16L12 26z" fill="#ffd400"/></svg></div>';
      return '';
    }
    const sf = dv.safety;
    if (sf.required && !sf.done && dv.surfacedAt == null) {
      if (sf.started && l.depth < 2.4) return '<div class="dic yel"><svg viewBox="0 0 24 48"><path d="M4 14h16L12 32z" fill="#000"/></svg></div>';
      if (l.depth >= 2.4 && l.depth <= 6) return '<div class="dic win"><svg viewBox="0 0 24 48"><path d="M4 5h16L12 22zM4 43h16L12 26z" fill="#ffd400"/></svg></div>';
    }
    return '';
  }

  function statusCell(surface) {
    const env = S.env, l = SN.sim.live, m = S.mode();
    const fl = S.settings.flashlight ? 'on' : '';
    const bat = Math.round(env.battery);
    const low = bat < 5 ? 'crit' : bat < 20 ? 'low' : '';
    const tp = SN.U.temp(l.temp);
    const dev = S.deviationUntil > S.now() || (SN.sim.dive && SN.sim.dive.deviation);
    if (!surface) {
      return cell('status', 432, 294, 256, 86, '<span class="fl ' + fl + '">' + I.flash + '</span>' + (dev ? '<span class="devic">' + I.warn + '</span>' : '') +
        '<span class="sv2">' + num(tp.v, tp.u) + '</span><span class="sv2 ' + low + '">' + num(bat, '%') + '</span>');
    }
    const gas = S.activeGas(m);
    const pods = SN.sim.podsFor(gas);
    let icons = '';
    if (S.settings.bt.sensors.length) icons += '<span class="ic hr ' + (env.hrBeltOn ? 'ok' : 'search') + '">' + I.heart + '</span>';
    if (m.extra.gps) icons += '<span class="ic gp ' + (l.gpsFix ? 'ok' : 'search') + '">' + I.gps + '</span>';
    let podI = '';
    if (pods.length) {
      const lowb = pods.some((p) => p.pod && p.pod.battery === 'low');
      podI = '<span class="ic pd ' + (lowb ? 'lowb' : '') + '">' + I.pod + '<b>x' + pods.length + '</b></span>';
    }
    return cell('status surf', 432, 294, 256, 86, '<span class="fl ' + fl + '">' + I.flash + '</span>' +
      '<span class="icons"><span>' + icons + '</span><span>' + podI + '</span></span>' +
      '<span class="bt"><span class="' + low + '">' + num(bat, '%') + '</span><span>' + num(tp.v, tp.u) + '</span></span>');
  }

  function render() {
    const l = SN.sim.live, dv = SN.sim.dive;
    let h = '<div class="scr face">';
    if (!dv) {
      // Oberflächen-Display (Kap. 4.1)
      const ll = lastLog();
      const md = ll ? SN.U.depth(ll.maxDepth, 1) : null;
      h += cell('depth surf', 0, 0, 348, 152, lab('MAX DEPTH') + '<div class="dsv">' + (md ? num(md.v, md.u) : num('- -')) + '</div>');
      h += ascentBar();
      h += cell('time surf', 0, 158, 250, 130, lab('LAST DIVE') + '<div class="tsv">' + num(ll ? SN.fmt.mmss(ll.duration) : '- -') + '</div>');
      h += decoCell(true);
      const st = ll ? SN.fmt.surfTime((S.now() - ll.end) / 1000) : null;
      h += cell('stop', 0, 294, 426, 86, ll ? '<div class="sv">' + num(st.v, st.u) + '</div><div class="sl">SURFACE TIME</div>' : '');
      h += switchWindow();
      h += statusCell(true);
    } else {
      const dd = SN.U.depth(l.depth, 1);
      h += cell('depth', 0, 0, 348, 152, '<div class="dv">' + num(dd.v, dd.u) + '</div>' + depthIcon(), SN.alarms.fieldLevel('depth'));
      h += ascentBar();
      h += cell('time', 0, 158, 250, 130, '<div class="tv">' + num(SN.fmt.mmss(dv.runtime)) + '</div>', SN.alarms.fieldLevel('time'));
      h += decoCell(false);
      h += stopCell();
      h += switchWindow();
      h += statusCell(false);
    }
    h += '</div>';
    return h;
  }

  const Face = {
    render,
    onButton(b, long) {
      const m = S.mode();
      const v = m.views[m.viewIndex % m.views.length];
      const inDive = !!SN.sim.dive;
      if (b === 'ok' && !long) { m.viewIndex = (m.viewIndex + 1) % m.views.length; S.save(); return true; }
      if (b === 'back') {
        if (v && v.type === 'large' && v.f[0] === 'compass') {
          if (!S.env.compassCal) return true;
          if (long) { compass.bearing = null; SN.ui.showToast(esc(t('Bearing cleared'))); }
          else { compass.bearing = (S.env.heading + S.settings.nav.declination + 360) % 360; SN.ui.showToast(esc(t('Bearing set'))); }
          return true;
        }
        if (v && v.type === 'large' && v.f[0] === 'stopwatch') {
          if (long) { stopwatch.running = false; stopwatch.acc = 0; }
          else if (stopwatch.running) { stopwatch.acc = swValue(); stopwatch.running = false; }
          else { stopwatch.since = S.now(); stopwatch.running = true; }
          return true;
        }
        return true;
      }
      if (b === 'up' && !long) {
        if (inDive) { SN.app.cycleBrightness(); return true; }
        SN.app.openWidgets(); return true;
      }
      if (b === 'down' && !long) {
        if (inDive) { SN.screens.diveMenu(); return true; }
        SN.screens.diveSettings(); return true;
      }
      return false;
    },
  };

  SN.face = { Face, FIELDS, fieldHTML, compass, stopwatch, num, bottleBar };
})(typeof window !== 'undefined' ? window : globalThis);
