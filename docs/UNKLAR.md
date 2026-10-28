# Unklare Punkte, Annahmen und Grenzen

Grundlage war ausschließlich die deutsche Bedienungsanleitung (2026-01-22) inkl. ihrer Screenshots.
Alles, was dort nicht eindeutig steht, ist hier aufgeführt – mit der im Emulator gewählten Lösung.

## 1. Nicht umsetzbar (Web-Grenzen)

| Thema | Stand im Emulator |
|---|---|
| Echte Sensoren (Drucksensor, Wasserkontakt, Kompass/Gyroskop, Beschleunigung, GPS) | über das Debug-Menü simuliert |
| Suunto Tank POD (123-kHz-Funk), HF-Gurt, Bluetooth, Suunto App, Sync, Pairing | simuliert; Pairing-Code ist eine Zufallszahl |
| Offline-Karten / echte Kartendaten | stilisierte Fantasie-Karte, nur Zoom/Stil/Verschieben |
| Wetter- und Gezeitendaten | Werte aus dem Debug-Menü |
| Tauchroute (Unterwasser-Routenverfolgung) | nur Schalter; wird laut Handbuch ohnehin nicht am Gerät angezeigt |
| Softwareupdate-Download, Versionshinweise | nur simulierter Ablauf |
| Vibration | Gerät „wackelt“ optisch; `navigator.vibrate` nur auf unterstützten Mobilgeräten |
| Handgelenk heben (AOD aufwecken) | Debug-Knopf |
| Akkulaufzeit | frei erfundenes Verbrauchsmodell, Akku per Debug einstellbar |
| Original-Firmware, Original-Schrift, Original-Icons | nachgezeichnet; Schrift „Barlow Semi Condensed“ als ähnlicher Ersatz |
| Speicher | `localStorage` des Browsers (Logbuch-Speicherlimit nicht nachgebildet) |

## 2. Display / Darstellung

- **Displayauflösung und exakte Farben** sind nicht angegeben → aus den Screenshots abgeleitet (688 × 380 px Layout).
- **Vertikaler Balken neben NO DECO/DECO** wird im Handbuch nicht erklärt → interpretiert als Oberflächen-GF relativ zu GF High.
- **Flaschendruck-Balken** (blau/gelb/rot, schraffiert): Skala und Grenzen nicht dokumentiert → rot < 50 bar, gelb bis 100 bar, Skala = max(Startdruck, 200 bar).
- **Aufstiegsbalken**: Text nennt grau < 2, grün 4–8, gelb > 8, rot > 10 m/min; der Bereich 2–4 m/min fehlt → wie Abbildung als 1 grüner Pfeil.
- **Stoppfeld vor Erreichen von 10 m** (noch kein Sicherheitsstopp erforderlich): Inhalt unbekannt → leer.
- **Format** der Tauchzeit > 99 min, der Gaszeit („0:36“ → als h:mm gedeutet) und der Oberflächenzeit h:mm nicht eindeutig.
- **GF99**: „Verwendetes Gas wird angezeigt, wenn die Gewebespannung geringer ist als der inspiratorische Inertgasdruck“ – unklar, was genau → „- -“.
- **Gewebediagramm**: Skala 0/50/100/150 % ohne Definition → Balkenlänge = Gewebedruck / Umgebungsdruck.
- **Algorithmus aus**: was statt NDL angezeigt wird, ist nicht beschrieben → „- -“.
- **Kompass in Mils**: Einheit im Handbuch als „Meilen“ übersetzt, gemeint sind vermutlich Mils (6400) → so umgesetzt.
- **Always-On-Display**: Aussehen unbekannt → abgedunkelte normale Anzeige.
- **Taschenlampe**: Position am Gehäuse unbekannt → Lichtkegel unterhalb des Geräts.
- **Trimix-Screenshot** zeigt bei 21/35 und ppO₂ 1,4 eine MOD von 48,6 m, die sich mit der sonst gültigen Formel nicht ergibt → überall dieselbe Formel (MOD = (ppO₂/fO₂ − 1) × 10 m).
- **Gasname bei 100 % O₂** und Trimix-Schreibweise → „NX100“ bzw. „TX21/35“ (wie Planer-Screenshot).

## 3. Navigation / Menüs

- **Reihenfolge der Taucheinstellungen**: Screenshots widersprechen sich (einmal „Personalisierung“, einmal „Planer“ direkt vor „Weitere Einstellungen“) → Tauchmodus, Gase, Algorithmus, Alarme, Tank PODs, Planer, Personalisierung, Weitere Einstellungen.
- **Systemsteuerung**: nach „Helligkeit“ abgeschnitten → Flugmodus, Konnektivität, Geräteeinstellungen ergänzt (im Handbuch erwähnte Funktionen).
- **Widget-Reihenfolge und Kartendesign** (außer Systemsteuerung) nicht abgebildet → Systemsteuerung, (Update), Frühere Tauchgänge, Karte, Wetter, Gezeiten.
- **Tauchmenü** (Down während des Tauchgangs) ist nicht beschrieben → Gasliste zum Gaswechsel.
- **NDL+TTS gleichzeitig**: Handbuch verweist auf nicht existierendes Kap. 4.8 → Option „No deco field“ unter Personalisierung.
- **Standard-Ansichten des Umschaltfensters**: nur View 1 und 2 im Screenshot lesbar → View 3 = Kompass angenommen.
- **Dauer „langes Drücken“** nicht angegeben → 0,9 s.
- **Touchscreen**: Handbuch erwähnt einmal „Wische nach oben“ (Systemsteuerung) und „Tippe…“ (wohl aus Uhren-Anleitungen kopiert) → nur Wischen nach oben implementiert.
- **Ersteinrichtung**: nach Sprache und Warnung „Ersteinstellungen“ ohne Details; der Warntext ist nicht abgedruckt → Einheiten + Zeitformat, Warntext sinngemäß aus Kap. 1.
- **Gerätesprache**: Screenshots zeigen englische Texte. Deutsch übernimmt nur Begriffe, die in der Anleitung vorkommen; der Rest bleibt englisch. Weitere Sprachen nicht umgesetzt.
- **Pfade im Handbuch widersprüchlich** (z. B. „Allgemein » Töne“, „Allgemein » Über“, „Einstellungen zurücksetzen“ unter „Allgemein“ vs. „Systemsteuerung > Geräteeinstellungen“) → alles unter Systemsteuerung > Geräteeinstellungen.
- **Dekoprofil-Standard** nicht genannt → „Gestuft“ (wie Screenshot des Algorithmus-Menüs).
- **Wertelisten/Schritte**: Flaschengrößen (Screenshot zeigt nur 11.1/12/15/18 L), Tiefenalarm-Schrittweite (1 m), Starttiefe-Minimum (1,2 m), GF-Eigene (10–100 in 5er-Schritten), Deklination (±30° in 0,5°), Tauchplaner-Tiefen (3–100 m) → angenommen.
- **Imperiale Flaschengröße** (cu ft) → Umrechnung mit 207 bar Nenndruck (80 cu ft ≈ 11,1 L).
- **Gaswechsel „verwerfen“**: genaue Bedienung unbekannt → Eintrag „Dismiss“ am Ende der Gasliste.
- **Nach Tauchgangsende**: Handbuch deutet eine Tauchgangsübersicht an → Übersicht wird automatisch angezeigt (bei aktivem „Gefühl“ zuerst „Wie war es?“).
- **Passcode-Eingabe**: Ziffern 1–4 = Tasten (laut Abbildung 1/2 oben, 3/4 unten). Short-Back ergibt „2“, langes Back löscht.
- **Geräte-„Über“-Seite**: Inhalte nicht dokumentiert → Produkt, Typ DW251 (aus CE-Erklärung), Hinweis „Emulator“.

## 4. Algorithmus / Berechnungen

- **Suuntos eigene Bühlmann-16-GF-Implementierung** ist nicht öffentlich → Standard ZHL-16C (Kompartiment 1b) mit GF nach Baker, Schreiner-Gleichung, Aufstieg 10 m/min. Die NDL-Werte des Planer-Screenshots (Luft, 40/85) werden exakt getroffen; Deko-Stoppzeiten können abweichen.
- **Wann gilt „Deko“**: hier NDL = 0 *und* der Aufstiegsplan enthält mindestens einen Stopp.
- **Höheneinstellung** → angenommener Oberflächendruck für den Algorithmus: 300–1500 m = 0,846 bar, 1500–3000 m = 0,701 bar.
- **Wasserart** → Dichten Süßwasser 1000, Salzwasser 1025, EN13319 1019,7 kg/m³.
- **Gestuft vs. Durchgehend**: Dekostufe = nächster Stopp (gestuft) bzw. Ceiling (durchgehend); Dekofenster = Dekostufe bis +3 m; Reserve 0,6 m. Dass die Berechnung oberhalb der Reserve „unterbrochen“ wird, ist nicht nachgebildet (Gewebe werden weiter gerechnet).
- **Sicherheitsstopp „Eingestellt“**: Verkürzungsregel unbekannt → 3 min minus 50 % der während der Deko in ≤ 6 m verbrachten Zeit.
- **Sicherheitsstopp nach erneutem Abstieg > 10 m**: nicht beschrieben → wird neu verlangt.
- **Entsättigungs-/Flugverbotszeit**: Kriterium für „entsättigt“ nicht angegeben → alle Kompartimente < 0,03 bar Übersättigung; Regeln 12 h / 75 min / 48 h wie im Handbuch.
- **OTU-Tagesgrenze** mit „reduzierter Erholungsfähigkeit“ → rollierendes 24-h-Fenster.
- **Gasverbrauch (AMV)**: Kompressibilitätsfaktor Z = f(p, T, O₂, He) nicht angegeben → Z = 1 (ideales Gas); AMV = −ΔV/Δt / (1 + 0,1 · Tiefe_avg) über ein 50–170-s-Fenster.
- **Gaszeit**: Formel (V − V_Reserve)/SAC; wie Reserve (35 bar) und Aufstieg (10 m/min) genau eingehen, ist offen → Reserve 35 bar + Aufstiegsgas, Verbrauch auf aktuelle Tiefe hochgerechnet.
- **Tauchplaner**: Abstieg 10 m/min (aus Screenshot abgeleitet); der Beispiel-Deko-Plan im Handbuch ist in sich nicht konsistent (Laufzeiten) → eigene, konsistente Berechnung.
- **Gaswechselvorschlag** genau bei Erreichen der MOD des besseren Gases (bei NX99/1,6 also 6,2 m statt der im Text genannten 6 m).
- **CNS**: NOAA-Tabelle, über 1,6 bar auf 1,6 begrenzt, Aufrundung der Anzeige, Halbwertszeit 90 min an der Oberfläche (wie Handbuch).

## 5. Nicht im Handbuch → bewusst nicht umgesetzt

- Apnoe-/Freitauchmodus (nur im Logbuch-Kapitel erwähnt, Gerät hat laut Kap. 4.3 nur Einzelgas/Multigas).
- Trainings-/Sportfunktionen anderer Suunto-Uhren.
- Details der Suunto-App-Logbuchfelder (Kap. 2.2.1) – das betrifft nur die App.
