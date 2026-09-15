# WoW Charakterplaner

Mobile und Desktop-fähige PWA zur Planung von World-of-Warcraft-Charakteren.

## Aktueller Stand: 0.1.1

- Dashboard
- Charaktere anlegen, bearbeiten und löschen
- Suche und Filter
- automatische Rassen-/Klassen-Matrix
- Berufsübersicht
- Rüstungsarten-Auswertung
- lokale Speicherung auf dem Gerät
- CSV-Import/-Export mit Semikolon
- JSON-Backup
- PWA-Manifest mit 192/512-Pixel-Icons
- Offline-Grundfunktion über Service Worker
- GitHub-Pages-Workflow

## CSV-Import

Unterstützte Spalten:

`Name;Volk;Fraktion;Klasse;Geschlecht;Beruf 1;Beruf 2;Midnight;Status;Server;Notizen`

Die bisherigen Kernspalten reichen:

`Name;Volk;Fraktion;Klasse;Geschlecht;Beruf 1;Beruf 2;Midnight`

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` ist für GitHub Pages vorbereitet.

Nach dem Hochladen:

1. Repository → **Settings**
2. **Pages**
3. Unter **Build and deployment** als **Source** → **GitHub Actions**
4. Workflow ausführen lassen bzw. einen Commit auf `main` pushen
5. Die veröffentlichte URL auf Android in Chrome öffnen
6. **⋮ → App installieren** / **Zum Startbildschirm hinzufügen**

## Datenschutz / Speicherung

0.1.1 speichert Charakterdaten ausschließlich im LocalStorage des verwendeten Browsers. Daten werden noch nicht zwischen Geräten synchronisiert.

## WoW-Daten

Patchabhängige Rassen-/Klassen-Regeln werden bewusst separat gepflegt und nicht als unbestätigte statische Regeln fest verdrahtet.
