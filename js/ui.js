/* UI-Grundbausteine: Navigation, Listen, Wertauswahl (Räder), Scroll-Ansichten, Popups */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});
  const t = (s) => SN.t(s);
  const esc = (s) => SN.esc(s);

  const nav = {
    stack: [],
    push(s) { this.stack.push(s); if (s.onShow) s.onShow(); },
    pop() { if (this.stack.length > 1) { const s = this.stack.pop(); if (s.onHide) s.onHide(); } },
    popTo(n) { while (this.stack.length > n) this.pop(); },
    root() { this.popTo(1); },
    replace(s) { this.stack.pop(); this.push(s); },
    top() { return this.stack[this.stack.length - 1]; },
  };

  // ---------- Icons (vereinfachte SVGs im Stil der Screenshots) ----------
  const I = {
    chev: '<svg viewBox="0 0 24 24" class="chev"><path d="M8 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    sliders: '<svg viewBox="0 0 24 24"><path d="M3 7h10M17 7h4M3 17h4M11 17h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="15" cy="7" r="2.4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="9" cy="17" r="2.4" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/></svg>',
    tank: '<svg viewBox="0 0 24 24"><rect x="8" y="6" width="8" height="16" rx="3" fill="currentColor"/><rect x="10.5" y="2" width="3" height="4" fill="currentColor"/><path d="M10 11h4M10 14h4" stroke="#000" stroke-width="1.4"/></svg>',
    tank2: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="7" height="15" rx="2.5" fill="currentColor"/><rect x="14" y="7" width="7" height="15" rx="2.5" fill="currentColor"/><rect x="5.3" y="3" width="2.4" height="4" fill="currentColor"/><rect x="16.3" y="3" width="2.4" height="4" fill="currentColor"/></svg>',
    flash: '<svg viewBox="0 0 24 24"><path d="M7 3h10l-2 6v12H9V9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 12v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 2l2 2M20 2l-2 2" stroke="currentColor" stroke-width="1.6"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    unlock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 017.6-1.7" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    bt: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10-5 4V3l5 4L7 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    plane: '<svg viewBox="0 0 24 24"><path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 00-3 0v5l-8 5v2l8-2.5v5.5l-2 1.5v1.5l3.5-1 3.5 1V20l-2-1.5V13z" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z" fill="currentColor"/><path d="M5 12h4l1.5-3 2 6 1.5-3h4" fill="none" stroke="#000" stroke-width="1.6"/></svg>',
    gps: '<svg viewBox="0 0 24 24"><path d="M21 3L3 10.5l7.5 3L13.5 21z" fill="currentColor"/></svg>',
    pod: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="11" height="15" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 18v3h4v-3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9.5a2 2 0 013 0M9 7.5a4 4 0 015 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 2.5L23 21.5H1z" fill="currentColor"/><path d="M12 9v6" stroke="var(--warnInk,#000)" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18.3" r="1.5" fill="var(--warnInk,#000)"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 11v6" stroke="#000" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="7.3" r="1.6" fill="#000"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 4h4M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    diver: '<svg viewBox="0 0 32 32"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9l4 3 5-1 4 4 6-1"/><path d="M13 11l-2 6 4 2-2 5"/><path d="M17 15l3 4 5-1"/><rect x="11" y="5" width="9" height="4" rx="2" transform="rotate(-12 15 7)"/></g><circle cx="26" cy="7" r="1.6" fill="currentColor"/><circle cx="28" cy="12" r="1.2" fill="currentColor"/><circle cx="25" cy="3" r="1" fill="currentColor"/></svg>',
    planner: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" fill="currentColor"/><path d="M8 13l3 3 5-6" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    update: '<svg viewBox="0 0 24 24"><path d="M12 3v11M7 9.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7" cy="20" r="1.2" fill="currentColor"/><circle cx="12" cy="20" r="1.2" fill="currentColor"/><circle cx="17" cy="20" r="1.2" fill="currentColor"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    cloud: '<svg viewBox="0 0 24 24"><path d="M7 18a4 4 0 01-.5-8 5.5 5.5 0 0110.7 1.2A3.5 3.5 0 0117 18z" fill="currentColor"/></svg>',
    wave: '<svg viewBox="0 0 24 24"><path d="M2 9c3-3 5 3 8 0s5 3 8 0 3-1 4 0M2 15c3-3 5 3 8 0s5 3 8 0 3-1 4 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    hist: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4 3v4h4M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    stopwatch: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="currentColor"/><path d="M12 13V8" stroke="#000" stroke-width="2.2" stroke-linecap="round"/><path d="M10 2h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    depthI: '<svg viewBox="0 0 24 24"><path d="M3 4c2-1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0M3 8c2-1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0M12 10v11M8 17l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hourglass: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="currentColor"/><path d="M7.5 5.5h9L12 12zM7.5 18.5h9L12 12z" fill="#000"/></svg>',
    infinity: '<svg viewBox="0 0 48 24"><path d="M12 4a8 8 0 100 16c6 0 10-16 24-16a8 8 0 110 16C22 20 18 4 12 4z" fill="none" stroke="currentColor" stroke-width="3.6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M6 3l15 9-15 9z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 3h4v18H6zM14 3h4v18h-4z" fill="currentColor"/></svg>',
    plug: '<svg viewBox="0 0 24 24"><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 01-12 0zM12 17v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  };

  function iconBox(svg, cls) { return '<span class="ibox ' + (cls || '') + '">' + svg + '</span>'; }

  function header(title, cls) {
    return '<div class="hdr ' + (cls || '') + '"><div class="hdr-t">' + esc(t(title)) + '</div></div>';
  }

  // ---------- Liste ----------
  class ListScreen {
    constructor(o) {
      Object.assign(this, { cursor: 0, scroll: 0 }, o);
      if (o.cursor != null) this.cursor = o.cursor;
    }
    getItems() { return (typeof this.items === 'function' ? this.items(this) : this.items).filter(Boolean); }
    selectable(it) { return it.kind !== 'section' && !it.disabled; }
    render() {
      const items = this.getItems();
      this._items = items;
      if (this.cursor >= items.length) this.cursor = Math.max(0, items.length - 1);
      if (items.length && !this.selectable(items[this.cursor])) this.cursor = this.nextSel(items, this.cursor, 1);
      let y = 0, cy = 0, ch = 0;
      const rows = items.map((it, i) => {
        const h = it.kind === 'section' ? 44 : it.h || (it.sub != null && it.sub !== '' ? 76 : 58);
        if (i === this.cursor) { cy = y; ch = h; }
        y += h + 4;
        return this.row(it, i === this.cursor, h);
      }).join('');
      const viewH = 380 - 86;
      if (cy - this.scroll + ch > viewH - 6) this.scroll = cy + ch - viewH + 6;
      if (cy < this.scroll) this.scroll = cy;
      return '<div class="scr list ' + (this.cls || '') + '">' + header(this.title) +
        (this.top ? this.top() : '') +
        '<div class="rview"><div class="rows" style="transform:translateY(' + (-this.scroll) + 'px)">' + rows + '</div></div></div>';
    }
    row(it, sel, h) {
      if (it.kind === 'section') return '<div class="row section">' + esc(t(it.label)) + '</div>';
      let right = '';
      if (it.kind === 'toggle') right = '<span class="tgl ' + (it.value ? 'on' : '') + '"><i></i></span>';
      else if (it.kind === 'check' || it.kind === 'radio') right = '<span class="chk ' + (it.value ? 'on' : '') + '">' + (it.value ? I.check : '') + '</span>';
      else if (sel && it.kind !== 'action' && it.kind !== 'info' && it.chev !== false) right = I.chev;
      const icon = it.icon ? it.icon : '';
      const body = it.html ? it.html : '<div class="rl">' + esc(t(it.label)) + '</div>' +
        (it.sub != null && it.sub !== '' ? '<div class="rs ' + (it.subCls || '') + '">' + (it.subHtml ? it.sub : esc(t(String(it.sub)))) + '</div>' : '');
      return '<div class="row ' + (sel ? 'sel ' : '') + (it.disabled ? 'disabled ' : '') + (it.cls || '') + '" style="height:' + h + 'px">' + icon +
        '<div class="rb">' + body + '</div><div class="rr">' + right + '</div></div>';
    }
    nextSel(items, i, dir) {
      let j = i;
      for (let k = 0; k < items.length; k++) {
        j += dir;
        if (j < 0 || j >= items.length) return i;
        if (this.selectable(items[j])) return j;
      }
      return i;
    }
    onButton(b, long) {
      const items = this._items || this.getItems();
      if (long) return false;
      if (b === 'up') { this.cursor = this.nextSel(items, this.cursor, -1); return true; }
      if (b === 'down') { this.cursor = this.nextSel(items, this.cursor, 1); return true; }
      if (b === 'back') { if (this.onBack) this.onBack(); else nav.pop(); return true; }
      if (b === 'ok') {
        const it = items[this.cursor];
        if (!it || it.disabled) return true;
        if (it.kind === 'toggle' && it.set) { it.set(!it.value); SN.state.save(); return true; }
        if (it.onOk) { it.onOk(this, it); SN.state.save(); }
        return true;
      }
      return false;
    }
  }

  // ---------- Wertauswahl (Räder) ----------
  class PickerScreen {
    constructor(o) {
      Object.assign(this, { col: 0 }, o);
      this.cols.forEach((c) => { if (c.index == null) c.index = 0; });
    }
    vals() { return this.cols.map((c) => c.values[c.index]); }
    render() {
      const cols = this.cols.map((c, ci) => {
        const f = c.fmt || ((v) => v);
        const v = c.values;
        const i = c.index;
        const act = ci === this.col;
        return '<div class="pcol ' + (act ? 'act' : '') + '" style="' + (c.w ? 'width:' + c.w + 'px' : '') + '">' +
          (c.label ? '<div class="plab">' + esc(c.label) + '</div>' : '') +
          '<div class="pprev">' + (i > 0 ? esc(f(v[i - 1])) : '&nbsp;') + '</div>' +
          '<div class="pcur">' + esc(f(v[i])) + '</div>' +
          '<div class="pnext">' + (i < v.length - 1 ? esc(f(v[i + 1])) : '&nbsp;') + '</div></div>' +
          (c.unit ? '<div class="punit">' + esc(c.unit) + '</div>' : '');
      }).join('');
      const last = this.col === this.cols.length - 1;
      const right = last && this.final === 'check' ? '<div class="pok">' + I.check + '</div>' : '<div class="pnx">' + I.chev + '</div>';
      return '<div class="scr picker">' + hints() + '<div class="ptitle">' + esc(t(this.title)) + '</div>' +
        '<div class="pcols">' + cols + '</div>' + right +
        (this.footer ? '<div class="pfoot">' + this.footer(this.vals()) + '</div>' : '') + '</div>';
    }
    onButton(b, long) {
      if (long) return false;
      const c = this.cols[this.col];
      if (b === 'up') { c.index = Math.max(0, c.index - 1); if (this.onChange) this.onChange(this); return true; }
      if (b === 'down') { c.index = Math.min(c.values.length - 1, c.index + 1); if (this.onChange) this.onChange(this); return true; }
      if (b === 'back') { if (this.col > 0) this.col--; else nav.pop(); return true; }
      if (b === 'ok') {
        if (this.col < this.cols.length - 1) this.col++;
        else { this.onDone(this.vals(), this); SN.state.save(); }
        return true;
      }
      return false;
    }
  }
  // Tastenhinweise an den Displayecken (wie in den Screenshots)
  function hints() {
    return '<div class="hint h-up">' + '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></div>' +
      '<div class="hint h-back"><svg viewBox="0 0 24 24"><path d="M9 6L4 11l5 5M4 11h10a5 5 0 010 10h-2" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></div>' +
      '<div class="hint h-down"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></div>' +
      '<div class="hint h-ok"><svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></div>';
  }

  // ---------- Scrollbare Inhaltsansicht ----------
  class InfoScreen {
    constructor(o) { Object.assign(this, { scroll: 0, maxScroll: 0 }, o); }
    render() {
      const html = typeof this.content === 'function' ? this.content(this) : this.content;
      return '<div class="scr info ' + (this.cls || '') + '"><div class="icontent" style="transform:translateY(' + (-this.scroll) + 'px)">' + html + '</div></div>';
    }
    afterRender(el) {
      const c = el.querySelector('.icontent');
      if (c) this.maxScroll = Math.max(0, c.scrollHeight - 380);
      if (this.scroll > this.maxScroll) this.scroll = this.maxScroll;
    }
    onButton(b, long) {
      if (long) return false;
      if (b === 'up') { this.scroll = Math.max(0, this.scroll - 110); return true; }
      if (b === 'down') {
        if (this.scroll >= this.maxScroll && this.onEnd) { this.onEnd(this); return true; }
        this.scroll = Math.min(this.maxScroll, this.scroll + 110); return true;
      }
      if (b === 'back') { if (this.onBack) this.onBack(this); else nav.pop(); return true; }
      if (b === 'ok') { if (this.onOk) this.onOk(this); return true; }
      return false;
    }
  }

  // ---------- Popups ----------
  let toastTimer = null;
  const toast = { html: null, until: 0 };
  function showToast(html, ms) {
    toast.html = html; toast.until = Date.now() + (ms || 1600);
  }
  function toastHtml() {
    if (!toast.html || Date.now() > toast.until) return '';
    return '<div class="toast">' + toast.html + '</div>';
  }

  /** Bestätigungsdialog als Liste */
  function confirm(title, text, okLabel, onYes, opts) {
    opts = opts || {};
    return new InfoScreen({
      cls: 'confirm',
      content: () => '<div class="cf">' + (opts.icon || '<div class="cf-ic warn">' + I.warn + '</div>') +
        '<div class="cf-t">' + esc(t(title)) + '</div><div class="cf-x">' + text + '</div>' +
        '<div class="cf-b"><span class="ybtn">' + I.arrowR + '</span>' + esc(t(okLabel)) + '</div></div>',
      onOk: () => { nav.pop(); onYes(); },
    });
  }

  SN.ui = { nav, I, iconBox, header, ListScreen, PickerScreen, InfoScreen, showToast, toastHtml, confirm, hints, range };

  function range(a, b, step, dec) {
    const out = [];
    for (let v = a; v <= b + 1e-9; v += step) out.push(dec != null ? +v.toFixed(dec) : v);
    return out;
  }
})(typeof window !== 'undefined' ? window : globalThis);
