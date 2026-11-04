# Kleinkram – Aufbau

Kleinkram ist eine Web-App (HTML, CSS, JavaScript ohne Framework), die mit **Capacitor 7** als Android-App verpackt wird. Dieselben Dateien laufen auch als Web-App über GitHub Pages.

## Ordner
| Ordner / Datei | Inhalt |
|---|---|
| `www/index.html` | Grundgerüst: Kopf, Navigation, Platzhalter, lädt CSS und Module |
| `www/css/app.css` | Gestaltung. Alle Farben als Tokens in `:root`, Dunkelmodus über `prefers-color-scheme` |
| `www/js/*.js` | Die App in 17 Modulen (siehe unten), werden in Nummern-Reihenfolge geladen |
| `www/sounds/` | Signaltöne zum Vorhören in der App |
| `www/lib/` | Fremdbibliotheken, werden beim Bau aus npm kopiert (nicht im Repo) |
| `native/` | Android-Teil: `KleinkramNativePlugin` (Kalender-Eintrag, Links öffnen), `AufraeumenPlugin` (Fotos/Dateien), `TexterkennungPlugin` (Google ML Kit, offline), `MainActivity`, `theme.py` (Statusleiste), `manifest.py` (Berechtigungen), `gradle.py` (zusätzliche Bibliotheken, z. B. ML Kit) |
| `resources/android/` | App-Icons und Signaltöne (`raw/`) für Android |
| `.github/workflows/app-bauen.yml` | Baut bei jedem Push APK + Web-App |

## Module (`www/js/`)
| Datei | Aufgabe |
|---|---|
| `01-grundlagen.js` | Hilfsfunktionen, Datum, Speicher (localStorage + IndexedDB für Fotos), Capacitor-Anbindung, Töne, Punkte & Titel |
| `02-aufgaben.js` | Routinen mit Rhythmus, wiederkehrende Aufgaben, Aufgaben-Logik, Mini-Schritte |
| `03-kalender.js` | Termine, Wiederholungen, deutsche Schnelleingabe („Zahnarzt Freitag 14 Uhr“) |
| `04-rechnungen-steuer.js` | IBAN-Prüfung, GiroCode lesen/erzeugen, Rechnungstext auslesen, § 35a |
| `05-ansichten.js` | Die fünf Bildschirme: Heute, Kalender, Aufgaben, Ablage, Ich |
| `06-kalender-export.js` | Kalender-Datei (.ics), Google-Kalender-Link, Export-Fenster |
| `07-steuerpaket-fristen.js` | Steuer-Paket als Datei, Fristen in Briefen erkennen |
| `08-haus.js` | Objekte, Mieteingänge, Nebenkosten-Frist, Zähler mit Verbrauchskurve |
| `09-garantie.js` | Garantien mit Erinnerung vor Ablauf |
| `10-rueckblick.js` | Wochen-Rückblick und Wochenziele |
| `11-vertraege.js` | Verträge, Kündigungsfristen, Fixkosten |
| `12-aufraeumen.js` | Handy aufräumen: doppelte Fotos/Dateien, Serienbilder, Ereignis-Alben, Screenshots, WhatsApp-Medien, Download sortieren, Papierkorb (Android-Teil: `native/AufraeumenPlugin.java`) |
| `13-erinnerungen.js` | Benachrichtigungen planen, Signaltöne, Status-Anzeige |
| `14-oberflaeche.js` | Rendern, Fenster (Sheets) mit Schließen/Wischen, 5-Minuten-Fokus |
| `15-scanner-daten.js` | Foto-Scanner, Texterkennung (Tesseract), Spar-Topf, Sicherung, Werkseinstellungen |
| `16-start.js` | Klicks und Eingaben, Android-Zurück-Taste, Statusleiste, Start |
| `17-plan-scannen.js` | Plan scannen: Dienst-/Bereitschaftsplan fotografieren, Zeilen bilden, Datum/KW lesen (Lücken im Wochenplan füllen), eigene Zeilen über Name oder Markierung (Kuli, Textmarker) finden, Prüfansicht, als Termine/Aufgaben eintragen |

Alle Module teilen sich einen globalen Zustand `S` (wird in `localStorage` unter `kleinkram-v1` gespeichert) und den Oberflächen-Zustand `UI`. Neue Funktionen bekommen ein eigenes Modul vor `13-erinnerungen.js` und werden in `index.html` und `sw.js` eingetragen.

## Regeln
- Alle Daten bleiben auf dem Gerät, keine fremden Server.
- Nichts wird automatisch verschickt oder überwiesen, immer Bestätigung durch den Nutzer.
- Updates nur mit demselben Signierschlüssel und Paketnamen `de.kleinkram.app`, sonst gehen Daten verloren.

## Geplant: eigener Server
Für gemeinsame Bereiche (Partnerin, Mutter) mit Rechten pro Person: Raspberry Pi 5 (4 GB) mit SSD, CouchDB + Tailscale in Docker, nächtliches Backup. Kleinkram gleicht dann ausgewählte Bereiche ab, der Rest bleibt lokal.
