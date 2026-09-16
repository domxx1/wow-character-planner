# WoW Charakterplaner

Mobile und Desktop-fähige PWA zur Planung von World-of-Warcraft-Charakteren.

## Aktueller Stand: 0.6.2

- Dashboard mit Gesamt-, Vorhanden- und Geplant-Zahlen
- Charaktere anlegen, bearbeiten und löschen
- Suche und Filter
- Rassen-/Klassen-Matrix mit aktuellen sowie ausdrücklich angekündigten Kombinationen
- Berufs- und Rüstungsarten-Auswertung
- lokale Offline-Speicherung
- private geräteübergreifende Synchronisierung über ein separates GitHub-Repository
- lokale Portraits können über das private Daten-Repository synchronisiert werden
- CSV-Import/-Export mit Semikolon
- JSON-Backup
- installierbare PWA und GitHub Pages

## CSV-Import

Aktuelle Vorlage:

`Name;Volk;Variante;Fraktion;Klasse;Geschlecht;Level;Spezialisierung;Beruf 1;Beruf 2;Erweiterung Remix;Status;Server;Region;Notizen`

Das frühere separate Feld `Midnight` wurde in 0.6.2 entfernt. Die Erweiterung Midnight kann weiterhin regulär als Wert unter `Erweiterung Remix` verwendet werden.

## Cloud-Synchronisierung

Die App selbst liegt im öffentlichen Repository. Persönliche Charakterdaten werden bei aktivierter Synchronisierung ausschließlich im separat konfigurierten privaten Daten-Repository gespeichert. Der Fine-grained GitHub Token wird nicht in dieses Repository geschrieben.

## WoW-Daten

Patchabhängige Rassen-/Klassen-Regeln werden separat gepflegt. Für Eclipse angekündigte Paladin-Optionen werden als zukünftige Kombinationen kenntlich gemacht und nicht als bereits in Patch 12.1 verfügbare Kombinationen ausgegeben.
