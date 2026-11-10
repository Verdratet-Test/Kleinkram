# Kleinkram – Aufbau

Kleinkram ist eine Web-App (HTML, CSS, JavaScript ohne Framework), die mit **Capacitor 7** als Android-App verpackt wird. Dieselben Dateien laufen auch als Web-App über GitHub Pages.

## Ordner
| Ordner / Datei | Inhalt |
|---|---|
| `www/index.html` | Grundgerüst: Kopf, Navigation, Platzhalter, lädt CSS und Module |
| `www/css/app.css` | Gestaltung. Alle Farben als Tokens in `:root`, Dunkelmodus über `prefers-color-scheme`. Sechs Designs über `data-skin` am `<html>` (Frisch, Klassik, Wald, Sonne, Ozean, Nacht), jedes hell und dunkel; Hell/Dunkel/Automatisch über `data-theme`. Alle Designs außer „Klassik“ bekommen den frischen Look (Verlaufskarte, schwebende Leiste, runde Ecken) |
| `www/js/*.js` | Die App in 26 Modulen (siehe unten), werden in Nummern-Reihenfolge geladen |
| `www/sounds/` | Signaltöne zum Vorhören in der App |
| `www/lib/` | Fremdbibliotheken, werden beim Bau aus npm kopiert (nicht im Repo) |
| `native/` | Android-Teil: `KleinkramNativePlugin` (Kalender-Eintrag, Links öffnen), `AufraeumenPlugin` (Fotos/Dateien), `TexterkennungPlugin` (Google ML Kit, offline), `ScanPlugin` (Dokumentenscanner von Google, QR-Codes per ML Kit, OpenCV: Blatt gerade ziehen und Ort fürs Wecker-Foto wiedererkennen), `SperrePlugin` (App-Sperre per Fingerabdruck/Display-Sperre), `MainActivity`, `theme.py` (Statusleiste), `manifest.py` (Berechtigungen), `gradle.py` (zusätzliche Bibliotheken: ML Kit Text/Bildlabels/Gesichter, TensorFlow Lite, Biometrie), `modelle/` (Gesichtsmodell MobileFaceNet, BSD-3); das ImageNet-Modell (EfficientNet-Lite2) lädt der Bau von Google herunter |
| `resources/android/` | App-Icons und Signaltöne (`raw/`) für Android |
| `.github/workflows/app-bauen.yml` | Baut bei jedem Push APK + Web-App |

## Module (`www/js/`)
| Datei | Aufgabe |
|---|---|
| `01-grundlagen.js` | Hilfsfunktionen, Datum, Speicher (localStorage + IndexedDB für Fotos), Capacitor-Anbindung, Töne, Punkte & Titel |
| `02-aufgaben.js` | Routinen mit Rhythmus, wiederkehrende Aufgaben, Aufgaben-Logik, Mini-Schritte |
| `03-kalender.js` | Termine, Wiederholungen, deutsche Schnelleingabe („Zahnarzt Freitag 14 Uhr“) |
| `04-rechnungen-steuer.js` | IBAN-Prüfung, GiroCode lesen/erzeugen, § 35a. Rechnung auslesen (`parseInvoice`): setzt die erkannten Textstücke nach ihrer Lage wieder zu Zeilen zusammen, bewertet jeden Betrag (Stichwort in der Zeile/Spalte, Rechenprobe Netto + Steuer = Brutto, Restbetrag nach Abschlägen), wählt die IBAN des Empfängers, findet Frist, Nummern, Empfänger; liefert Alternativen und Fundstellen fürs Prüfen |
| `05-ansichten.js` | Die fünf Bildschirme: Heute, Kalender, Aufgaben, Ablage, Ich |
| `06-kalender-export.js` | Kalender-Datei (.ics), Google-Kalender-Link, Export-Fenster |
| `07-steuerpaket-fristen.js` | Steuer-Paket als Datei, Fristen in Briefen erkennen |
| `08-haus.js` | Objekte, Mieteingänge, Nebenkosten-Frist, Zähler mit Verbrauchskurve |
| `09-garantie.js` | Garantien mit Erinnerung vor Ablauf |
| `10-rueckblick.js` | Wochen-Rückblick und Wochenziele |
| `11-vertraege.js` | Verträge, Kündigungsfristen, Fixkosten |
| `12-aufraeumen.js` | Handy aufräumen: doppelte Fotos/Dateien, Serienbilder, Ereignis-Alben, Screenshots, WhatsApp-Medien, Download sortieren, Papierkorb, Rechnungen & Briefe in Fotos finden (Android-Teil: `native/AufraeumenPlugin.java`, Texterkennung ML Kit) |
| `13-erinnerungen.js` | Benachrichtigungen planen, Signaltöne, Status-Anzeige, Knöpfe Erledigt/Später in Benachrichtigungen, Schlummern |
| `14-oberflaeche.js` | Rendern, Fenster (Sheets) mit Schließen/Wischen, 5-Minuten-Fokus |
| `15-scanner-daten.js` | Rechnung/Dokument einlesen: Blatt gerade ziehen (`prepDoc`), Überweisungs-Code (`readPay`), Texterkennung mit Lage (`ocrFull`; App: ML Kit, Browser: Tesseract), mehrere Seiten, Prüf-Fenster mit Foto-Ausschnitten; außerdem Spar-Topf, Sicherung, Werkseinstellungen |
| `16-start.js` | Klicks und Eingaben, Android-Zurück-Taste, Statusleiste, Start |
| `17-plan-scannen.js` | Plan scannen: Dienst-/Bereitschaftsplan fotografieren, Zeilen bilden, Datum/KW lesen (Lücken im Wochenplan füllen), eigene Zeilen über Name oder Markierung (Kuli, Textmarker) finden, Prüfansicht, als Termine/Aufgaben eintragen |
| `18-sicherung-sperre.js` | Automatische Wochen-Sicherung nach Dokumente/Kleinkram/Sicherungen (verwalten, einspielen), App-Sperre mit Sperrbildschirm |
| `19-fotos-ordnen.js` | Ordnung in den Fotos: Reise-Alben (Aufnahmeort + Datum, Land offline aus `www/data/laender.js`), Themen-Alben (Bildinhalt per ML Kit), Haustiere nach Namen (Beispiele + Farbprofil) |
| `20-personen-tiere.js` | Personen & Tiere: Gesichter gruppieren und benennen, Wiedererkennung über Gesichts-Merkmale (MobileFaceNet), Korrekturen lernen, benannte Haustiere wiedererkennen; Beispiele in IndexedDB (`kk-leute`) |
| `21-wecker.js` | Wecker mit Aufgabe: Wecker verwalten, Aufgaben (Rechnen, Schütteln, Abtippen, Foto von einem Ort – in der App per OpenCV über markante Punkte + geometrische Probe, Vergleichsfotos in IndexedDB `ort-<id>-0/1` –, Muster merken), Klingel-Bildschirm, Schlummern, „Bist du wach?“-Check, Morgen-Bildschirm. Android-Teil: `WeckerPlugin`, `WeckerReceiver` (setAlarmClock, Neustart), `WeckerService` (Klingeln, Vollbild über Sperrbildschirm) |
| `22-briefe.js` | Eigener PDF-Erzeuger (A4, Helvetica, Umlaute, ohne Bibliothek), Geschäftsbrief nach DIN 5008, Vorlagen: Kündigung (aus Verträgen), Einspruch Steuerbescheid (Frist: Bekanntgabe +4 Tage +1 Monat), Widerspruch, freier Brief |
| `23-nebenkosten.js` | Betriebskostenabrechnung pro Objekt/Jahr: Kostenarten § 2 BetrKV, Umlageschlüssel (Fläche, Personen, Einheiten, Verbrauch, 30/70, 50/50, Betrag je Mieter), Zeitanteile, Vorauszahlungen, Vorbefüllen aus Belegen, PDF je Mieter mit § 35a-Hinweis |
| `24-ablaufdaten.js` | Ausweise & Prüftermine (Personalausweis, Pass, Führerschein, TÜV, Karten …) mit Vorlauf-Aufgabe |
| `25-kopf-leeren.js` | Kopf leeren (Schnellerfassung auf „Heute“, später als Aufgabe/Termin/Notiz einsortieren) und Daten fürs Widget (Android-Teil: `KleinkramWidget`, Layout in `resources/android/layout`) |
| `26-struktur.js` | Einsteiger-Aufbau: Einrichtung beim ersten Start (Name, Funktionen wählen, Design), Bereich „Mehr“ (Werkzeug-Kacheln + Einstellungen in eigenen Fenstern), Design-Auswahl, Funktionen ein-/ausblenden (`S.set.mods`, Daten bleiben erhalten), „Plus für alles“ mit Foto-Erkennung (GiroCode/Rechnung → Überweisung, viele Datumszeilen → Plan scannen, sonst Dokument) |

Alle Module teilen sich einen globalen Zustand `S` (wird in `localStorage` unter `kleinkram-v1` gespeichert) und den Oberflächen-Zustand `UI`. Neue Funktionen bekommen ein eigenes Modul vor `13-erinnerungen.js` und werden in `index.html` und `sw.js` eingetragen.

## Regeln
- Alle Daten bleiben auf dem Gerät, keine fremden Server.
- Nichts wird automatisch verschickt oder überwiesen, immer Bestätigung durch den Nutzer.
- Updates nur mit demselben Signierschlüssel und Paketnamen `de.kleinkram.app`, sonst gehen Daten verloren.

## Geplant: eigener Server
Für gemeinsame Bereiche (Partnerin, Mutter) mit Rechten pro Person: Raspberry Pi 5 (4 GB) mit SSD, CouchDB + Tailscale in Docker, nächtliches Backup. Kleinkram gleicht dann ausgewählte Bereiche ab, der Rest bleibt lokal.

## Scannen und Erkennen (seit v1.31)
- **Aufnahme:** „Foto aufnehmen“ bei Rechnung, Dokument, Kaufbeleg und im Plus öffnet in der App den Dokumentenscanner von Google (`ScanPlugin.scannen`, Abfangen der Klicks in `14-oberflaeche.js`, abschaltbar unter Mehr → Allgemein). Fällt er aus, kommt die normale Kamera. „Plan scannen“ nutzt weiter die normale Kamera (Stift-Markierungen sollen unverändert bleiben).
- **Galerie-/Kamerafotos:** `ScanPlugin.begradigen` sucht das Blatt (OpenCV: Kanten, Helligkeit, Farbsättigung → größtes Viereck) und entzerrt es; nur wenn es sich klar vom Untergrund abhebt.
- **Wecker-Ort:** `ScanPlugin.ortPruefen` – Graubild, Helligkeit strecken + CLAHE (dunkles Zimmer), SIFT-Punkte, Paare per Ratio-Test, RANSAC-Probe (Homographie ≥ 16 passende Punkte oder Fundamentalmatrix ≥ 28). In Tests: fremde Motive höchstens 7/10, dieselbe Stelle 60–600.
- **Probe-Bau:** Branch pushen und `gh workflow run app-bauen.yml --ref <branch>` baut nur die APK; Release und Web-App gibt es ausschließlich von `main`.
