# Mein Bücherregal – Version 10.3

V10.3 basiert auf der stabilen V10.1. Die experimentelle 0.5x-Kameraauswahl aus V10.2 ist nicht enthalten.

## Neu: Datensicherheit

### Feste Standard-Datenquelle
Die App kennt automatisch:
https://mein-buecherregal-api.neviodipalma.workers.dev

Auf einem neuen Gerät musst du die URL normalerweise nicht erneut eintragen.

### Vollständiges JSON-Backup
Das Backup enthält:
- alle Bücher
- Reihen-Einstellungen / manuelle Gesamtzahlen
- Datenquelle
- Ansichtsmodus
- Backup-Version
- Exportdatum

### Backup-Erinnerung
Ein neues Backup wird empfohlen:
- wenn noch nie eines erstellt wurde
- nach 30 Tagen
- oder nach 20 Änderungen seit dem letzten Backup

Nach einem JSON-Export wird der Änderungszähler zurückgesetzt.

### Datensicherheitsbereich
Unter „Sicherheit & Export“ siehst du:
- Anzahl Bücher
- letztes Backup
- Änderungen seit Backup
- Status des Browserspeichers

„Speicher schützen“ fragt den Browser nach persistentem Speicher, sofern unterstützt.

### Sicherer Import
Vor dem Import zeigt die App:
- Datum des Backups
- Backup-Version
- Bücher im Backup
- aktuelle Bücher auf dem Gerät
- wie viele Bücher beim Zusammenführen neu wären
- Datenquelle im Backup

Danach:
- **Ersetzen**: stellt das Backup vollständig wieder her
- **Zusammenführen**: behält aktuelle Bücher und fügt nur neue hinzu

Duplikate werden bevorzugt über ISBN erkannt; ohne ISBN über Titel + Autor.

## Empfehlung
JSON-Backups in iCloud Drive speichern, z. B. in:
iCloud Drive → Bücherregal Backups

## Update
Nur GitHub Pages aktualisieren. Cloudflare bleibt unverändert.
