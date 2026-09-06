# Mein Bücherregal – Version 10.1

## iPhone / Safari Scanner Fix

Safari auf iOS stellt `BarcodeDetector` normalerweise nicht zur Verfügung.
V10 hat deshalb den Scan abgebrochen, bevor Safari überhaupt nach
Kamerazugriff fragen konnte.

V10.1:
- nutzt weiterhin den nativen BarcodeDetector, wenn vorhanden
- verwendet auf iPhone/Safari automatisch ZXing als Fallback
- funktioniert sowohl für:
  - normalen „ISBN scannen“-Button
  - Schnellscan
- Schnellscan bleibt nach einem Buch offen und ist direkt für das nächste bereit
- Duplikaterkennung bleibt aktiv

Beim ersten Start des Scanners sollte Safari nun tatsächlich nach der
Kameraberechtigung fragen.

Für das Update nur GitHub Pages aktualisieren. Cloudflare bleibt unverändert.
