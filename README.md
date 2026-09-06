# Mein Bücherregal – Version 9

## Library Intelligence
- Serien-Vollständigkeit
- fehlende Bände
- externe Reihensuche über den Cloudflare Worker
- manuelle Gesamtzahl als Override, falls externe Daten unsicher sind
- Reihen-Detailansicht
- Duplikat-Warnung
- Lesefortschritt pro Buch
- Re-Reads
- Erscheinungsjahr
- Seitenzahl
- Tags
- physischer Standort im echten Regal
- erweitertes Dashboard

## Update
### GitHub Pages
App-Dateien aus diesem Paket hochladen und bestehende Dateien ersetzen.

### Cloudflare
`book-api-worker-v8.js` in den bestehenden Worker kopieren und deployen.

Die bestehende lokale Sammlung bleibt kompatibel.
