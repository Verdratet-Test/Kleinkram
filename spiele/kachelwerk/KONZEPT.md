# Kachelwerk – Spielkonzept aus der Play-Store-Auswertung

Grundlage: `Play_Store_Spiele_Auswertung.md` (teuerste, beliebteste, downloadstärkste und umsatzstärkste Play-Store-Spiele).
Ergebnis: **Kachelwerk**, ein Block-Puzzle-Roguelike. Spielbarer Prototyp: [`index.html`](index.html) (eine Datei, läuft offline im Browser).

---

## 1. Analyse der Liste

**Fazit.** Hohe Kaufpreise zerfallen in zwei Welten: Die Apps für 265–999,99 $ (Phantom Productions, Fisherpunk, OrbitX) sind Scherz- und Prestige-Artikel ohne Spielwert und ohne Spieler. Echte Premium-Spiele kosten 10–50 €, aber die Käufer kommen erst im Bereich 5–15 €: *Balatro* und *Slay the Spire* (je 9,99 €) liegen bei 1,8–1,9 Mio.+ Downloads und 4,3–4,7 ★, *Dune: Imperium* (10,99 €) holt sogar 4,9 ★. Ab 25–50 € wird der Käuferkreis klein (*SaGa Emerald Beyond*, *Dragon Quest Builders*). Die Download-Spitze (*Subway Surfers*, *Free Fire*, *Ludo King*, *Block Blast!*) gewinnt über einfache Bedienung, geringe Hardware-Ansprüche, Offline-Spiel und Werbung, verdient pro Nutzer aber wenig. Die Umsatz-Spitze (*Honor of Kings*, *Candy Crush*, *PUBG Mobile*, *MONOPOLY GO!*, *Whiteout Survival*, *Last War*) setzt auf Free-to-Play mit Skins, Boostern, Würfeln und Beschleunigern, also auf Live-Ops und wenige zahlungskräftige Vielzahler. *Roblox* ist die seltene Ausnahme, die beides verbindet, weil es eine Plattform mit nutzergemachten Inhalten und eigener Währung ist. Für Spieler bedeutet Free-to-Play: Der Einstieg kostet nichts, das Spiel kann über die Zeit aber weit mehr kosten als jedes Kaufspiel.

**Die drei wichtigsten Erkenntnisse**

- **Preis-Sweet-Spot 5–15 €.** Dort stehen die bestbewerteten und meistgekauften Premium-Spiele. Höhere Preise schrumpfen die Zielgruppe, Preise über 250 $ sind ein Gag.
- **Reichweite und Umsatz folgen verschiedenen Regeln.** Reichweite kommt durch Einfachheit und „gratis“; Umsatz kommt durch In-App-Käufe und dauernde Events. Beides gleichzeitig schaffen fast nur Plattformen wie *Roblox*.
- **Live-Ops-Umsatz ist ein Großbetrieb.** Die Umsatz-Könige brauchen große Teams, Marketingbudgets und wöchentliche Events. Für ein kleines Projekt ist das kein realistisches Modell.

---

## 2. Entscheidung: einmaliger Preis

| Modell | Spricht dafür | Spricht dagegen |
|---|---|---|
| Free-to-Play mit Ingame-Shop | höchster Umsatz bei den Top-Titeln, maximale Reichweite | braucht Live-Ops-Team und Marketing, Umsatz hängt an wenigen Vielzahlern, schlechtere Bewertungen, versteckte Kosten |
| Werbefinanziert | Reichweite wie *Block Blast!* | sehr wenig Umsatz pro Nutzer, stört den Spielfluss |
| **Einmaliger Preis (gewählt)** | die bestbewerteten Spiele der Liste nutzen dieses Modell, fair, kein Event-Zwang, passt zu einem kleinen Team | weniger Downloads als bei „gratis“ |

**Gewählt: 4,99 € einmalig, die ersten drei Aufträge als Gratis-Demo.**

- 4,99 € liegt am unteren Rand des Sweet Spots (wie *Stardew Valley*) und ist ein Spontankauf.
- Die Demo nach dem Vorbild von *Alien: Isolation* (erste Level gratis) holt einen Teil der Reichweite eines Gratis-Downloads zurück.
- Keine Werbung, keine In-App-Käufe. Es gibt einen **Laden im Spiel**, der aber nur Münzen nimmt, die man im Spiel verdient. Das liefert das Sammel- und Ausbaugefühl der Free-to-Play-Spiele ohne Echtgeld.

---

## 3. Das Spiel

**Genre:** Block-Puzzle (Zugänglichkeit wie *Block Blast!*) kombiniert mit einem Roguelike-Lauf (Wiederspielwert wie *Balatro* und *Slay the Spire*).
**Thema:** Eine Kachel-Werkstatt im Stil Delfter Fliesen. Man legt glasierte Kacheln, erfüllt Aufträge und arbeitet sich zum Meisterbrief vor.

### Kernschleife
1. **Legen:** Drei Teile liegen in der Ablage und werden aufs 8×8-Raster gezogen. Sind alle drei gelegt, kommen drei neue.
2. **Abräumen:** Volle Reihen und Spalten verschwinden. **Punkte = Basis × Faktor.** Basis: 10 je Kachel. Faktor: Zahl der Linien plus Serie (Züge mit Abräumen hintereinander).
3. **Auftrag:** Jeder Auftrag hat ein Punkteziel und einen Korb mit 24 Teilen. Ziel erreicht → Münzen. Korb leer oder kein Platz mehr → Lauf vorbei.
4. **Laden:** Werkzeuge (bis 5, wirken dauerhaft) und Kniffe (bis 2, einmalig) kaufen, verkaufen, neu bestücken.
5. **Meisterstück:** Jeder dritte Auftrag hat eine Sonderregel. Nach Auftrag 9 gibt es den Meisterbrief, danach einen Endlos-Modus.

### Besondere Kacheln
- **Goldkachel:** +1 Münze beim Abräumen.
- **Sternkachel:** +2 Faktor beim Abräumen.
- **Steinkachel** (nur im Meisterstück): blockiert Platz, zählt nicht zur Basis.

### 20 Werkzeuge (passiv, kombinierbar)
| Werkzeug | Wirkung |
|---|---|
| Spachtel | +30 Basis je Linie |
| Herzstück | +60 Basis, wenn ein Mittelfeld abgeräumt wird |
| Eckstein | +3 Faktor, wenn eine Ecke abgeräumt wird |
| Rahmenleiste | +2 Faktor je Randlinie |
| Kreuzzange | Reihe und Spalte im selben Zug: Punkte ×2 |
| Reine Glasur | +5 Faktor je einfarbiger Linie |
| Schwerlast | +4 Faktor, wenn ein Teil mit 5+ Kacheln abräumt |
| Feinarbeit | +80 Basis, wenn ein Teil mit 1–2 Kacheln abräumt |
| Langer Atem | Serie zählt doppelt |
| Sicherheitsnetz | Serie übersteht einen Zug ohne Abräumen |
| Blitzblank | Raster danach leer: Punkte ×4 |
| Vitrine | +1 Faktor je Werkzeug |
| Goldwaage | +4 Basis je Münze im Beutel |
| Lehrling | wächst: +1 Faktor dauerhaft je Abräumen von 3+ Linien |
| Sparsamer Meister | +1 Faktor je 4 übrige Teile |
| Goldfuge | doppelt so viele Goldkacheln, je 2 Münzen |
| Sternstaub | mehr Sternkacheln, je +4 Faktor |
| Brennofen | +1 Mischen pro Auftrag |
| Großer Korb | +4 Teile pro Auftrag |
| Sparschwein | Zinsen: +1 Münze je 4 Münzen (max. +5) |

### 4 Kniffe (einmalig)
Hammer (eine Kachel entfernen) · Abriss (3×3-Feld räumen) · Drehscheibe (Teil drehen) · Restkachel (Teil wird zur Einzelkachel).

### 6 Meisterstück-Regeln
Gesprungene Kacheln (8 Steine im Raster) · Nur waagerecht (Spalten zählen nicht) · Schwere Lieferung (nur Teile ab 4 Kacheln) · Trockene Fuge (kein Mischen, keine Kniffe) · Billiger Ton (Basis halbiert) · Knapper Korb (6 Teile weniger).

---

## 4. Vom Fazit zum Design

| Erkenntnis aus der Liste | Umsetzung in Kachelwerk |
|---|---|
| Sweet Spot 5–15 €, Top-Wertungen bei Premium ohne Mikrotransaktionen | 4,99 € einmalig, keine In-App-Käufe |
| *Alien: Isolation*: erste Level gratis anspielbar | Aufträge 1–3 als Demo |
| Download-Könige: einfach, offline, läuft auf jedem Gerät | Ein-Finger-Steuerung, eine HTML-Datei ohne Server, keine aufwendige Grafik |
| *Balatro* / *Slay the Spire*: Wiederspielwert durch Kombinationen | 20 Werkzeuge mit Synergien, zufällige Laden-Angebote, 6 Sonderregeln |
| *Block Blast!*: Block-Puzzle ist ein Massenformat | bekanntes Grundprinzip, sofort verständlich |
| Umsatz-Könige: Shop, Booster, Beschleuniger | Laden nur mit erspielten Münzen, Kniffe statt Booster |
| Versteckte Kosten bei Free-to-Play | Preis steht auf dem Titelbildschirm, es gibt nichts nachzukaufen |
| Scherz-Apps für 999,99 $ | bewusst nicht: kein Prestige-Preis |

---

## 5. Balancing

Ein einfacher Bot (legt gierig, plant nicht voraus) hat jeden Auftragstyp einige hundert Mal gespielt, jeweils mit vollem Korb (24 Teile):

| Ausrüstung | Median-Punkte | 10–90 %-Bereich |
|---|---|---|
| ohne Werkzeuge | ~1.040 | 720–1.520 |
| 2 Werkzeuge | ~1.450 | 990–2.090 |
| 3 Werkzeuge | ~3.190 | 1.870–4.510 |
| 4 Werkzeuge | ~3.850 | 2.860–5.170 |
| 5 Werkzeuge mit Synergie | ~5.580 | 3.080–8.360 |

Daraus die Ziele: **300 · 550 · 900 · 1.300 · 1.900 · 2.600 · 3.500 · 4.600 · 6.000**, danach im Endlos-Modus ×1,45 pro Auftrag. Die ersten Aufträge sind leicht (Einstieg), ab Auftrag 7 braucht man eine Ausrüstung, die zusammenpasst.

---

## 6. Prototyp

- **Starten:** `index.html` im Browser öffnen (Handy oder PC). Schriften kommen von Google Fonts, ohne Netz greifen Systemschriften.
- **Steuerung:** Teile ziehen (Finger oder Maus). Alternativ Teil antippen, aufs Raster tippen, Vorschau nochmal antippen. Tastatur: `1`–`3` wählen, Pfeiltasten, `Enter` legen, `M` mischen, `Esc` abbrechen.
- **Speichern:** Der laufende Lauf und der Bestwert liegen im Browser (localStorage).
- **Hell/Dunkel:** folgt der Systemeinstellung.

### Bis zur Store-Version fehlt
- Demo-Sperre nach Auftrag 3 und einmaliger Kauf über Google Play Billing (im Prototyp ist alles frei)
- Verpackung als Android-App (z. B. Capacitor wie bei Kleinkram)
- Musik, mehr Soundeffekte, Erfolge, Tageslauf mit festem Zufallswert
- Feinschliff am Balancing mit echten Spielern
