# Suunto Nautic – Web-Emulator

Inoffizielle, interaktive Demo des Tauchcomputers **Suunto Nautic**, nachgebaut anhand der
deutschen Bedienungsanleitung (Stand 2026-01-22) und der darin enthaltenen Display-Screenshots.

> ⚠️ Nur zum Ausprobieren/Lernen. **Nicht zur Tauchgangsplanung oder zum Tauchen verwenden.**

## Starten

Kein Build nötig – reines HTML/CSS/JavaScript ohne Abhängigkeiten.

- `index.html` direkt im Browser öffnen **oder**
- lokal servieren: `python3 -m http.server` und `http://localhost:8000` öffnen.

Online über GitHub Pages: Der Workflow `.github/workflows/pages.yml` veröffentlicht die Seite bei jedem Push.
Einmalig nötig: *Settings → Pages → Source: GitHub Actions*. (Bei privaten Repos setzt GitHub Pages ein kostenpflichtiges
GitHub-Abo voraus; sonst das Repo öffentlich machen.)

Die Schrift (Barlow Semi Condensed) wird von Google Fonts geladen; offline wird eine Systemschrift verwendet.
Einstellungen, Logbuch und Gewebesättigung werden im `localStorage` des Browsers gespeichert.

## Bedienung

Vier Tasten wie am Gerät (Kap. 2.1): **Up** (oben links), **Back** (oben rechts), **Down** (unten links), **OK** (unten rechts).

| Tastatur | Taste |
|---|---|
| `↑` / `W` | Up |
| `↓` / `S` | Down |
| `Enter` / `D` / Leertaste | OK |
| `Esc` / `Backspace` / `A` | Back |

Taste ≥ 0,9 s halten = langes Drücken. Gerätetasten auch per Maus/Touch bedienbar.

| | An der Oberfläche | Während des Tauchgangs |
|---|---|---|
| Up kurz | Widgets (Systemsteuerung, Frühere Tauchgänge, Karte, Wetter, Gezeiten) | Helligkeit |
| Up lang | Taschenlampe | Taschenlampe |
| Down kurz | Taucheinstellungen | Tauchmenü (Gase / Gaswechsel) |
| Down lang | Tastensperre | Tastensperre |
| OK kurz | Umschaltfenster wechseln | Umschaltfenster wechseln |
| Back kurz/lang | Kompass: Peilung setzen/löschen · Stoppuhr: Start/Stopp/Reset | dto. |

Beim ersten Start ist das Gerät aus: **Up lang drücken** → Einrichtungsassistent.
Wischen nach oben auf dem Oberflächen-Display öffnet ebenfalls die Systemsteuerung.
Alle vier Tasten 12 s halten = Neustart (Soft-Reset).

## Debug-Menü (rechts)

- **Live-Werte**: Tiefe, Umgebungsdruck, NDL/TTS, Ceiling/Dekostufe, Stopps, GF99, ppO₂, CNS/OTU, AMV, Gaszeit, aktive Alarme …
- **Zeit & Gerät**: Zeitraffer 1×–300×, Zeitsprünge, Akku, Ladekabel, Handgelenk heben, App-Verbindung, Software-Update, Werkseinstellungen.
- **Tiefe & Wasser**: Zieltiefe + Auf-/Abstiegsgeschwindigkeit, Wasserkontakt-Sensor (auto/trocken/nass), reale Wasserdichte, Luftdruck/Höhenlage, Wasser- und Lufttemperatur.
- **Kompass/GPS/HF**: Kurs, Kalibrierung, GPS-Signal und Fix-Dauer, Position, HF-Gurt + Herzfrequenz.
- **Tank PODs & Atmung**: Atemminutenvolumen, Druck je POD, aktiv/Reichweite/Akku, Sidemount-Flaschenwahl.
- **Szenarien**: Freizeit-TG, Nullzeit-Warnung, Dekotauchgang, Multigas (wie Handbuch-Beispiel 9.6), zu schneller Aufstieg,
  Dekostufe verletzt → Algorithmusabweichung, niedriger Flaschendruck, ppO₂ zu hoch, Sicherheitsstopp-Fenster verlassen,
  Sidemount, Bergsee, Druckkammer (ohne Wasserkontakt).
- **Wetter & Gezeiten**: Daten, die sonst von der Suunto App kämen.

## Umfang

Umgesetzt sind u. a.: Ersteinrichtung, Oberflächen- und Tauch-Display mit allen Feldern des Umschaltfensters (Kap. 4.6) inkl.
Kompass mit Peilung, Stoppuhr und Gewebediagramm; automatischer Tauchstart/-ende (Starttiefe, Tauchendzeit, Wasserkontakt);
Bühlmann ZHL-16C mit Gradientfaktoren (Konservatismus Niedrig/Mittel/Hoch/Eigene), Dekoprofil Gestuft/Durchgehend,
Sicherheitsstopp 3/4/5 min/Eingestellt/Aus, letzter Deko-Stopp 3/6 m, Höheneinstellung, Algorithmus aus;
Einzelgas/Multigas mit Gasliste, Gaszustand, Gemisch (O₂/He/ppO₂ → MOD), Flaschengröße, Gaswechselvorschlag;
Tank POD (bis 2 je Gas, Sidemount), Flaschendruck, Gasverbrauch (AMV), Gaszeit; alle obligatorischen und benutzerdefinierten
Alarme mit Ton/Vibration/Aussehen und Prioritäts-Quittierung; Tauchplaner (No deco / Deko inkl. Plan & Profil);
Logbuch mit Statistik, Zusammenfassung, Profil, Gasliste, Gewebe; Oberflächenzeit und Flugverbot; CNS (90-min-Halbwertszeit)/OTU;
Systemsteuerung (Taschenlampe, Tastensperre, Helligkeit, Flugmodus, Konnektivität, HF-Gurt koppeln, Geräteeinstellungen,
Einheiten, Töne, Trageausrichtung, Sprache, Gerätesperre mit Passcode, Zeit/Datum, Gewebe zurücksetzen, Werkseinstellungen,
Softwareaktualisierung); AOD nach 5 min, Ruhemodus nach 1 h, Tiefschlaf nach 48 h; Karten-Widget (stilisiert) mit
Kartenstilen, Verschieben, POIs, Navigationseinstellungen; Wetter- und Gezeiten-Widget.

Validierung: Die berechneten Nullzeiten für Luft bei GF 40/85 stimmen exakt mit dem Planer-Screenshot im Handbuch überein
(20 m: 32 min, 25 m: 18, 30 m: 12, 35 m: 8, 40 m: 6).

**Was unklar ist oder nicht 1:1 geht: siehe [`docs/UNKLAR.md`](docs/UNKLAR.md).**

## Struktur

```
index.html          Gerät + Debug-Panel
css/device.css      Gehäuse, Tasten
css/screen.css      Display-Stile (688×380 px)
css/debug.css       Debug-Panel
js/deco.js          Bühlmann ZHL-16C + GF, NDL, Aufstiegsplan, CNS/OTU
js/util.js          Einheiten, Formatierung, deutsche Begriffe
js/state.js         Einstellungen (Standardwerte laut Handbuch), Persistenz
js/sim.js           Sensor-/Tauchgangssimulation, Stopps, Tank POD, Logbuch
js/alarms.js        obligatorische + Benutzeralarme, Ton, Vibration
js/ui.js            Navigation, Listen, Wertauswahl, Scroll-Ansichten
js/face.js          Haupt-Display und Umschaltfenster
js/screens.js       alle Menüs, Planer, Logbuch, Widgets
js/app.js           Tasten, Energiezustände, Sperren, Render-Schleife
js/debug.js         Debug-Menü und Szenarien
```
