# Mein Bücherregal

Eine kostenlose, private PWA für dein persönliches Bücherregal.

## Funktionen
- Virtuelles Bücherregal mit Buchcovern
- Buch per ISBN suchen
- ISBN-Barcode scannen, wenn der Browser `BarcodeDetector` unterstützt
- Status: ungelesen / lese ich / gelesen
- Bewertung, Reihe, Band, Genre, Notizen
- Suche und Filter
- Gruppierung nach Reihe, Genre oder Autor
- Backup Export/Import als JSON
- Lokale Speicherung im Browser

## Wichtig zum iPhone-Scan
Der automatische Scan verwendet die native `BarcodeDetector`-API.
Falls Safari sie auf deinem Gerät nicht anbietet, funktioniert weiterhin die manuelle ISBN-Eingabe + automatische Buchsuche.

## Schnell testen
1. Die Dateien über einen kleinen Webserver öffnen, z. B. GitHub Pages.
2. `index.html` nicht einfach doppelklicken, wenn du Kamera/PWA testen willst – Kamera braucht normalerweise HTTPS.
3. Auf dem iPhone in Safari öffnen.
4. Teilen → "Zum Home-Bildschirm".

## Kostenlos veröffentlichen
GitHub Pages ist für so ein persönliches Projekt ausreichend und kostenlos.

## Datenschutz
Deine Bücher werden in `localStorage` auf deinem Gerät gespeichert.
Open Library wird nur aufgerufen, wenn du eine ISBN nachschlägst.
