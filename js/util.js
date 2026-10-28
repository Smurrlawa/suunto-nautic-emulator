/* Formatierung, Einheiten, Übersetzung */
(function (G) {
  'use strict';
  const SN = (G.SN = G.SN || {});

  // Deutsche Begriffe: soweit möglich wörtlich aus der deutschen Bedienungsanleitung.
  // Begriffe, die im Handbuch nicht vorkommen, bleiben englisch (wie in den Screenshots).
  const DE = {
    'CONTROL PANEL': 'SYSTEMSTEUERUNG', 'Flashlight': 'Taschenlampe', 'Button lock': 'Tastensperre',
    'Brightness': 'Helligkeit', 'BRIGHTNESS': 'HELLIGKEIT', 'Low': 'Niedr.', 'Medium': 'Mittel', 'High': 'Hoch',
    'Device settings': 'Geräteeinstellungen', 'DEVICE SETTINGS': 'GERÄTEEINSTELLUNGEN', 'Connectivity': 'Konnektivität',
    'CONNECTIVITY': 'KONNEKTIVITÄT', 'Discovery': 'Discovery', 'Airplane mode': 'Flugmodus',
    'Pair new device': 'Neues Gerät verbinden', 'Paired devices': 'Verbundene Geräte', 'Remove': 'Entfernen',
    'Units': 'Einheiten', 'UNITS': 'EINHEITEN', 'Metric': 'Metrisch', 'Imperial': 'Imperial',
    'Wear orientation': 'Trageausrichtung', 'WEAR ORIENTATION': 'TRAGEAUSRICHTUNG', 'Buttons left': 'Tasten links', 'Buttons right': 'Tasten rechts',
    'Language': 'Sprache', 'LANGUAGE': 'SPRACHE', 'Device lock': 'Gerätesperre', 'DEVICE LOCK': 'GERÄTESPERRE',
    'Use passcode': 'Passcode verwenden', 'Change passcode': 'Passcode ändern', 'Time/Date': 'Zeit/Datum', 'TIME/DATE': 'ZEIT/DATUM',
    'Automatic time update': 'Automatische Zeitaktualisierung', 'About': 'Über', 'ABOUT': 'ÜBER',
    'Tissue reset': 'Gewebe zurücksetzen', 'Reset settings': 'Einstellungen zurücksetzen', 'Reset': 'Zurücksetzen',
    'Software update': 'Softwareaktualisierung', 'Sounds': 'Töne', 'SOUNDS': 'TÖNE', 'Vibration': 'Vibration',
    'DIVE SETTINGS': 'TAUCHEINSTELLUNGEN', 'Dive mode': 'Tauchmodus', 'DIVE MODE': 'TAUCHMODUS', 'Single gas': 'Einzelgas', 'Multigas': 'Multigas',
    'Gases': 'Gase', 'GASES': 'GASE', 'Algorithm': 'Algorithmus', 'ALGORITHM': 'ALGORITHMUS', 'Alarms': 'Alarme', 'ALARMS': 'ALARME',
    'Customization': 'Personalisierung', 'CUSTOMIZATION': 'PERSONALISIERUNG', 'Switch window': 'Fenster wechseln', 'SWITCH WINDOW': 'FENSTER WECHSELN',
    'Additional settings': 'Weitere Einstellungen', 'ADDITIONAL SETTINGS': 'WEITERE EINSTELLUNGEN', 'Dive planner': 'Planer',
    'Dive route': 'Tauchroute', 'Dive start depth': 'Starttiefe Tauchg.', 'Dive end time': 'Tauchendzeit', 'Water type': 'Wassertyp',
    'Fresh water': 'Süßwasser', 'Salt water': 'Salzwasser', 'Feeling': 'Gefühl',
    'Deco profile': 'Dekoprofil', 'Continuous': 'Durchgehend', 'Stepped': 'Gestuft', 'Safety stop': 'Sicherh.-Stopp',
    'SAFETY STOP': 'SICHERH.-STOPP', 'STOP DONE': 'STOPP BEEND.', 'Last deco stop': 'Letzter Deko-Stopp', 'Altitude': 'Höhe',
    'Conservatism': 'Konservatismus', 'CONSERVATISM': 'KONSERVATISMUS', 'Custom': 'Eigene', 'Always off': 'Immer aus', 'Adjusted': 'Eingestellt',
    'New gas': 'Neues Gas', 'Active': 'Aktiv', 'Enabled': 'Aktiviert', 'Disabled': 'Deaktiviert', 'DISABLED GASES': 'DEAKTIVIERTE GASE',
    'Active gas': 'Aktives Gas', 'Mixture': 'Gemisch', 'Tank size': 'Flaschengröße', 'Delete gas': 'Gas löschen',
    'No tank POD': 'Kein Tank Pod', 'Not linked': 'Nicht verbunden', 'GAS STATE': 'GASSTATUS',
    'Mute all audio': 'Alle Töne stummschalten', 'Mute all vibration': 'Alle Vibrationen stummschalten',
    'Depth': 'Tiefe', 'Dive time': 'Tauchzeit', 'Tank pressure': 'Flaschendruck', 'Gas time': 'Gaszeit', 'Sidemount': 'Sidemount',
    'Notify': 'Benachr.', 'Caution': 'Vorsicht', 'Appearance': 'Aussehen', 'Short': 'Kurz', 'Long': 'Lang', 'Off': 'Aus', 'On': 'Ein',
    'Save view': 'Ansicht speichern', 'Delete view': 'Ansicht löschen', 'Double': 'Doppelt', 'Large': 'Groß',
    'No deco': 'No deco', 'Deco': 'Deko', 'Done': 'Fertig', 'Later': 'Später', 'Install now': 'Jetzt installieren',
    'Dive history': 'Frühere Tauchgänge', 'DIVE HISTORY': 'FRÜHERE TAUCHGÄNGE', 'Map': 'Karte', 'Weather': 'Wetter', 'Tides': 'Gezeiten',
    'Map style': 'Kartenstil', 'Light': 'Hell', 'Dark': 'Dunkel', 'High contrast': 'Hoher Kontrast', 'Winter': 'Winter',
    'Pan map': 'Kartenausschnitt verschieben', 'Save position as POI': 'Position als POI speichern',
    'Navigation settings': 'Navigationseinstellungen', 'Declination': 'Deklination', 'Compass unit': 'Kompasseinheit',
    'Position format': 'Positionsformat', 'Calibrate compass': 'Kompass kalibrieren', 'Save': 'Speichern',
    'Weak': 'Schwach', 'Average': 'Durchschnittlich', 'Good': 'Gut', 'Very good': 'Sehr gut', 'Excellent': 'Ausgezeichnet',
    'How was it?': 'Wie war es?', 'Tank PODs': 'Tank PODs', 'Bearing set': 'Peilung festgelegt', 'Bearing cleared': 'Peilung gelöscht',
    'Buttons locked': 'Tasten gesperrt', 'Buttons unlocked': 'Tasten entsperrt', 'Dismiss': 'Verwerfen', 'Time format': 'Zeitformat',
  };

  function t(s) {
    if (!s) return s;
    if (SN.state && SN.state.settings.language === 'de' && DE[s]) return DE[s];
    return s;
  }

  const U = {
    depth(m, dec = 1) {
      const u = SN.state.settings.units.depth;
      if (u === 'ft') return { v: (m * 3.28084).toFixed(0), u: 'ft' };
      return { v: m.toFixed(dec), u: 'm' };
    },
    depthVal(m) { return SN.state.settings.units.depth === 'ft' ? m * 3.28084 : m; },
    depthFromVal(v) { return SN.state.settings.units.depth === 'ft' ? v / 3.28084 : v; },
    press(bar) {
      if (SN.state.settings.units.pressure === 'psi') return { v: Math.round(bar * 14.5038).toString(), u: 'psi' };
      return { v: Math.round(bar).toString(), u: 'bar' };
    },
    temp(c) {
      if (SN.state.settings.units.temp === 'F') return { v: Math.round(c * 9 / 5 + 32).toString(), u: '°F' };
      return { v: Math.round(c).toString(), u: '°C' };
    },
    vol(l) { // l/min
      if (SN.state.settings.units.volume === 'cuft') return { v: (l / 28.3168).toFixed(2), u: 'cu ft/min' };
      return { v: l.toFixed(1), u: 'l/min' };
    },
  };

  // 45'36  (Minuten'Sekunden); ab 100 min h:mm'ss
  function mmss(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    if (m >= 100) {
      const h = Math.floor(m / 60);
      return h + ':' + String(m % 60).padStart(2, '0') + '′' + String(s).padStart(2, '0');
    }
    return m + '′' + String(s).padStart(2, '0');
  }
  // Dauer für Logbuch: 1:08'28 bzw. 38'50
  function durLog(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + '′' + String(s).padStart(2, '0');
    return m + '′' + String(s).padStart(2, '0');
  }
  /** Oberflächenzeit (Kap. 4.5): bis 1 h m'ss, bis 24 h h:mm, bis 7 Tage h, danach Tage */
  function surfTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    if (sec < 3600) return { v: mmss(sec), u: '' };
    if (sec < 86400) return { v: Math.floor(sec / 3600) + ':' + String(Math.floor(sec / 60) % 60).padStart(2, '0'), u: 'h' };
    if (sec < 7 * 86400) return { v: String(Math.floor(sec / 3600)), u: 'h' };
    return { v: String(Math.floor(sec / 86400)), u: 'd' };
  }
  function clock(ms, withSec) {
    const d = new Date(ms);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    if (SN.state.settings.timeFormat === '12h') {
      const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
      return h + ':' + m + (withSec ? ':' + String(d.getSeconds()).padStart(2, '0') : '') + ' ' + ap;
    }
    return String(h).padStart(2, '0') + ':' + m + (withSec ? ':' + String(d.getSeconds()).padStart(2, '0') : '');
  }
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function date(ms) { const d = new Date(ms); return d.getDate() + '. ' + MONTHS_EN[d.getMonth()] + ' ' + d.getFullYear(); }
  function dateShort(ms) { const d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
  function dateLong(ms) { const d = new Date(ms); return d.getDate() + '. ' + MONTHS_LONG[d.getMonth()] + ' ' + d.getFullYear(); }

  function gasName(g) {
    if (g.he > 0) return 'TX' + g.o2 + '/' + g.he;
    if (g.o2 === 21) return 'AIR';
    return 'NX' + g.o2;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  SN.t = t;
  SN.U = U;
  SN.fmt = { mmss, durLog, surfTime, clock, date, dateShort, dateLong, gasName };
  SN.esc = esc;
  SN.clamp = clamp;
})(typeof window !== 'undefined' ? window : globalThis);
