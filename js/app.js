/* Gerätesteuerung: Tasten, Energiezustände, Sperren, Render-Schleife (Kap. 2.1, 3.3–3.5, 3.11, 3.15) */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});
  const S = SN.state;
  const nav = SN.ui.nav;
  const esc = SN.esc;
  const t = (s) => SN.t(s);

  const LONG_MS = 900;          // Schwelle für langes Drücken (im Handbuch nicht angegeben)
  const RESET_MS = 12000;       // Kap. 3.15: alle vier Tasten 12 s
  const AOD_MS = 5 * 60e3, SLEEP_MS = 3600e3, DEEP_MS = 48 * 3600e3, LOCK_MS = 15 * 60e3;

  const app = {
    power: 'off',       // off | on | booting
    locked: false,      // Gerätesperre (Passcode)
    lastInput: 0,       // simulierte Zeit
    bootMsg: '',
    shakeUntil: 0,
  };
  SN.app = app;

  let screenEl, deviceEl;

  // ---------------- Tasten ----------------
  const ORIENT = { left: { up: 'up', back: 'back', down: 'down', ok: 'ok' }, right: { up: 'ok', back: 'down', down: 'back', ok: 'up' } };
  const held = new Map(); // logical -> {t0, longFired, timer}
  let resetTimer = null;

  function press(b) {
    if (held.has(b)) return;
    const h = { t0: Date.now(), longFired: false };
    h.timer = setTimeout(() => { h.longFired = true; handle(b, true); }, LONG_MS);
    held.set(b, h);
    markBtn(b, true);
    if (held.size === 4) {
      resetTimer = setTimeout(() => { held.forEach((x) => { x.longFired = true; }); softReset(); }, RESET_MS - LONG_MS);
    }
  }
  function release(b) {
    const h = held.get(b);
    if (!h) return;
    clearTimeout(h.timer);
    held.delete(b);
    markBtn(b, false);
    if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
    if (!h.longFired) handle(b, false);
  }
  function markBtn(b, on) {
    const el = document.querySelector('.btn[data-b="' + physFor(b) + '"]');
    if (el) el.classList.toggle('down', on);
  }
  function physFor(logical) {
    const m = ORIENT[S.settings.orientation];
    return Object.keys(m).find((k) => m[k] === logical);
  }

  function handle(b, long) {
    const live = SN.sim.live;
    const inDive = !!SN.sim.dive;
    if (app.power === 'booting') return;
    if (app.power === 'off') {
      // Tiefschlaf / aus: nur langes Drücken der oberen Taste weckt (Kap. 2, 3.5)
      if (b === 'up' && long) boot();
      return;
    }
    if (S.env.battery <= 0 && !S.env.charging) return;
    const wasAsleep = live.sleeping || live.aod;
    app.lastInput = S.now();
    if (wasAsleep) { wake(); live.wasSleeping = false; return; }

    // Alarme quittieren (auch bei Tastensperre)
    if (inDive) {
      const a = SN.alarms.ack();
      if (a) {
        if (a.id === 'gasswitch') SN.screens.diveMenu();
        return;
      }
    }
    // Tastensperre (Kap. 3.4)
    if (S.settings.buttonLock) {
      if (b === 'down' && long) { S.settings.buttonLock = false; SN.ui.showToast(esc(t('Buttons unlocked'))); S.save(); }
      else SN.ui.showToast(SN.ui.I.lock + ' ' + esc(t('Buttons locked')));
      return;
    }
    // Gerätesperre (Kap. 3.11)
    if (app.locked && !inDive) {
      if (!(nav.top() instanceof SN.screens.PasscodeScreen)) {
        askPasscode();
        return;
      }
    }
    const top = nav.top();
    if (top instanceof SN.screens.PasscodeScreen) { top.onButton(b, long); return; }
    if (long) {
      if (b === 'up') { S.settings.flashlight = !S.settings.flashlight; S.save(); return; }
      if (b === 'down') { S.settings.buttonLock = true; SN.ui.showToast(SN.ui.I.lock + ' ' + esc(t('Buttons locked'))); S.save(); return; }
    }
    if (top && top.onButton) top.onButton(b, long);
  }

  function askPasscode() {
    const pc = S.settings.passcode;
    nav.push(new SN.screens.PasscodeScreen({
      title: 'Enter passcode',
      onCode: (c) => {
        if (c === pc.code) { pc.fails = 0; app.locked = false; nav.pop(); S.save(); }
        else {
          pc.fails++;
          S.save();
          SN.ui.showToast('Wrong passcode (' + pc.fails + '/5)', 1500);
          if (pc.fails >= 5) {
            // Kap. 3.11: nach 5 Fehlversuchen muss das Gerät zurückgesetzt werden
            SN.ui.showToast('Too many attempts – device reset required', 3000);
            setTimeout(() => app.factoryReset(), 2500);
          }
        }
      },
    }));
  }

  // ---------------- Energiezustände ----------------
  function boot() {
    app.power = 'booting';
    app.bootMsg = '';
    setTimeout(() => {
      app.power = 'on';
      app.lastInput = S.now();
      SN.sim.live.sleeping = false; SN.sim.live.aod = false;
      nav.stack = [SN.face.Face];
      if (!S.settings.setupDone) SN.screens.setupWizard(() => nav.root());
      else if (S.settings.passcode.enabled) app.locked = true;
    }, 1800);
  }
  app.reboot = function (msg, after) {
    app.power = 'booting';
    app.bootMsg = msg || '';
    setTimeout(() => {
      if (after) after();
      app.bootMsg = '';
      setTimeout(() => {
        app.power = 'on'; app.lastInput = S.now();
        nav.stack = [SN.face.Face];
        if (!S.settings.setupDone) SN.screens.setupWizard(() => nav.root());
      }, 1500);
    }, msg ? 3500 : 0);
  };
  function softReset() {
    if (SN.sim.dive) { SN.ui.showToast('Never reset during a dive!', 2000); } // Kap. 3.15 Warnung – trotzdem wie Gerät
    app.reboot('', null);
  }
  app.factoryReset = function () {
    S.factoryReset();
    SN.alarms.clear();
    app.locked = false;
    app.applyOrientation();
    app.reboot('', null);
  };
  function wake() {
    const l = SN.sim.live;
    if (l.sleeping) l.wasSleeping = true;
    l.sleeping = false; l.aod = false;
    app.lastInput = S.now();
  }
  app.wake = wake;
  app.raiseWrist = function () { if (SN.sim.live.aod) wake(); };

  function powerTick() {
    const l = SN.sim.live;
    if (app.power !== 'on') return;
    if (!app.lastInput) app.lastInput = S.now();
    if (S.env.battery <= 0 && !S.env.charging) { app.power = 'off'; nav.stack = [SN.face.Face]; return; }
    if (SN.sim.dive || l.wet) { if (l.sleeping || l.aod) wake(); app.lastInput = Math.max(app.lastInput, S.now() - 1000); return; }
    const idle = S.now() - app.lastInput;
    if (S.env.battery < 2 && !S.env.charging) l.sleeping = true; // sehr niedriger Akku -> Ruhemodus
    if (idle > DEEP_MS) { app.power = 'off'; l.sleeping = false; l.aod = false; return; }
    if (idle > SLEEP_MS) { l.sleeping = true; l.aod = false; }
    else if (idle > AOD_MS) { if (!l.sleeping) l.aod = true; }
    if (S.settings.passcode.enabled && (idle > LOCK_MS || l.sleeping) && !app.locked) app.locked = true;
  }

  // ---------------- Tauchgang-Ereignisse ----------------
  app.onDiveStart = function () {
    // Auto-Start aus jeder Ansicht in den Tauchzustand (Kap. 4.2); Gerätesperre wird aufgehoben (Kap. 3.11)
    app.locked = false;
    nav.stack = [SN.face.Face];
    wake();
    SN.sim.live.gpsSearchStart = 0;
  };
  app.onDiveEnd = function (log, wasLocked) {
    nav.stack = [SN.face.Face];
    const show = () => SN.screens.logDetail(log);
    if (S.mode().extra.feeling) SN.screens.feeling(log, show); else show();
    if (wasLocked || S.settings.passcode.enabled && wasLocked) app.locked = true;
  };
  app.openWidgets = function () { SN.screens.widgets(); };
  app.cycleBrightness = function () {
    const o = ['low', 'medium', 'high'];
    S.settings.brightness = o[(o.indexOf(S.settings.brightness) + 1) % 3];
    SN.ui.showToast(SN.ui.I.sun + ' ' + esc(t('Brightness')) + ': ' + esc(t({ low: 'Low', medium: 'Medium', high: 'High' }[S.settings.brightness])));
    S.save();
  };
  app.shake = function () { app.shakeUntil = Date.now() + 500; };
  app.applyOrientation = function () {
    if (deviceEl) deviceEl.classList.toggle('flip', S.settings.orientation === 'right');
  };

  // ---------------- Rendern ----------------
  function render() {
    const l = SN.sim.live;
    let html;
    const scr = document.getElementById('screen');
    scr.className = 'screen b-' + S.settings.brightness + (l.aod ? ' aod' : '');
    if (app.power === 'off') {
      html = S.env.charging ? chargingHtml() : '<div class="scr black"></div>';
    } else if (app.power === 'booting') {
      html = '<div class="scr boot"><div class="logo"><span class="tri"></span>SUUNTO</div>' + (app.bootMsg ? '<div class="bootmsg">' + esc(app.bootMsg) + '<div class="prog"><i></i></div></div>' : '') + '</div>';
    } else if (l.sleeping) {
      html = (S.env.charging || S.env.battery < 2) ? chargingHtml() : '<div class="scr black"></div>';
    } else {
      const top = nav.top() || SN.face.Face;
      html = top.render() + SN.ui.toastHtml();
    }
    screenEl.innerHTML = html;
    const top = nav.top();
    if (top && top.afterRender && app.power === 'on') top.afterRender(screenEl);
    deviceEl.classList.toggle('shake', Date.now() < app.shakeUntil);
    deviceEl.classList.toggle('torch', S.settings.flashlight && app.power === 'on');
  }
  function chargingHtml() {
    return '<div class="scr charging"><div class="bigbat"><i style="width:' + Math.round(S.env.battery) + '%"></i></div><div class="cpct">' + SN.ui.I.plug + ' ' + Math.round(S.env.battery) + ' %</div></div>';
  }

  // ---------------- Eingaben ----------------
  const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Enter: 'ok', KeyD: 'ok', Space: 'ok', Backspace: 'back', Escape: 'back', KeyA: 'back' };
  function bindInput() {
    document.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const b = KEYS[e.code];
      if (!b) return;
      e.preventDefault();
      if (!e.repeat) press(b);
    });
    document.addEventListener('keyup', (e) => {
      const b = KEYS[e.code];
      if (b) { e.preventDefault(); release(b); }
    });
    document.querySelectorAll('.btn').forEach((el) => {
      const phys = el.dataset.b;
      const logical = () => ORIENT[S.settings.orientation][phys];
      let lg = null;
      const down = (e) => { e.preventDefault(); lg = logical(); press(lg); el.setPointerCapture && e.pointerId != null && el.setPointerCapture(e.pointerId); };
      const up = (e) => { e.preventDefault(); if (lg) release(lg); lg = null; };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    // Wischen nach oben auf dem Oberflächen-Display -> Systemsteuerung (Kap. 3)
    let sy = null;
    screenEl.addEventListener('pointerdown', (e) => { sy = e.clientY; });
    screenEl.addEventListener('pointerup', (e) => {
      if (sy == null) return;
      const dy = sy - e.clientY; sy = null;
      if (S.settings.orientation === 'right') return;
      if (dy > 40 && app.power === 'on' && !SN.sim.dive && nav.stack.length === 1 && !S.settings.buttonLock && !app.locked) {
        app.lastInput = S.now(); SN.screens.controlPanel();
      }
    });
  }

  function fit() {
    const wrap = document.getElementById('devwrap');
    const W = 980, H = 720;
    const avail = Math.min(wrap.clientWidth / W, (window.innerHeight - 20) / H, 1.2);
    deviceEl.style.transform = 'scale(' + Math.max(0.3, avail) + ')';
    wrap.style.height = H * Math.max(0.3, avail) + 'px';
  }

  function init() {
    screenEl = document.getElementById('screen');
    deviceEl = document.getElementById('device');
    const had = S.load();
    if (had) {
      // seit dem letzten Speichern vergangene Zeit an der Oberfläche nachholen
      const gap = (Date.now() - S.savedAt) / 1000;
      SN.sim.fastForward(gap);
    }
    nav.stack = [SN.face.Face];
    app.applyOrientation();
    bindInput();
    fit();
    window.addEventListener('resize', fit);
    if (had && S.settings.setupDone) { app.power = 'on'; app.lastInput = S.now(); if (S.settings.passcode.enabled) app.locked = true; }
    let last = performance.now();
    let saveT = 0;
    setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      if (app.power === 'on' || app.power === 'off') SN.sim.tick(dt);
      SN.alarms.update();
      powerTick();
      render();
      if (SN.debug) SN.debug.refresh();
      saveT += dt;
      if (saveT > 5) { saveT = 0; S.save(); }
    }, 100);
    window.addEventListener('beforeunload', () => S.save());
  }
  app.press = press; app.release = release; app.boot = boot;
  app.tap = function (b, long) { if (long) { handle(b, true); } else handle(b, false); };
  document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
