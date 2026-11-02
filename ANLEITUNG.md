# Kleinkram auf GitHub – Anleitung

Einmal einrichten, danach baut GitHub bei jeder Änderung automatisch:
- die **APK** (immer neueste: `https://github.com/DEINNAME/kleinkram/releases/latest/download/Kleinkram.apk`)
- die **Web-App** über https (`https://DEINNAME.github.io/kleinkram`)

Am besten am PC. Dauert etwa 10 Minuten. Befehle brauchst du keine.

## 1. Repo anlegen
1. Auf github.com anmelden → oben rechts **+** → **New repository**
2. Name: `kleinkram` · Sichtbarkeit: **Public** · sonst nichts ankreuzen → **Create repository**

## 2. Dateien hochladen
1. `kleinkram-github.zip` entpacken.
2. Im neuen Repo auf **uploading an existing file** klicken.
3. **Den Inhalt** des entpackten Ordners hineinziehen, also alle Dateien und Ordner, auch `.github`.
   (Mac: versteckte Ordner mit `Cmd + Shift + .` einblenden.)
4. Unten **Commit changes**.

## 3. Signierschlüssel hinterlegen (wichtig für Updates)
Im Repo: **Settings → Secrets and variables → Actions → New repository secret**, zweimal:

| Name | Wert |
|---|---|
| `KEYSTORE_B64` | der lange Text aus `GEHEIM-github-secrets.txt` |
| `KEYSTORE_PASS` | das Passwort aus derselben Datei |

Die Datei `GEHEIM-github-secrets.txt` **niemals** ins Repo hochladen.

## 4. Web-App einschalten
**Settings → Pages → Build and deployment → Source: GitHub Actions**

## 5. Bau starten
**Actions → App bauen → Run workflow**. Nach etwa 5–8 Minuten ist alles grün.
Die APK liegt dann unter **Releases**.

## 6. Daten umziehen
Die GitHub-App ist eine neue App neben der Konverter-Version.
1. In der alten App: **Ich → Daten → Sicherung anzeigen → Als Datei speichern**.
2. Neue `Kleinkram.apk` installieren.
3. In der neuen App: **Ich → Daten → Sicherung einspielen → Sicherungsdatei wählen**.
4. Klappt alles, kannst du die alte App löschen.

## Wenn etwas rot wird
Unter **Actions** den roten Lauf öffnen, den roten Schritt aufklappen, Screenshot machen und an Claude schicken.

## Einfacher geht's mit Claude
GitHub in claude.ai unter Konnektoren verbinden und Claude sagen: „Lade Kleinkram in mein Repo hoch.“ Dann erledigt Claude Schritte 2–5.

## Erinnerungen auf der Smartwatch (z. B. Xiaomi Watch S5)
In der **Mi Fitness**-App auf dem Handy: Benachrichtigungen → App-Benachrichtigungen → **Kleinkram** und **Google Kalender** einschalten. Die Texte sind kurz gehalten, damit sie aufs Uhren-Display passen.
