# Mein Bücherregal – Version 12.0

## Neu: Bibliotheksmodus

Version 12.0 baut auf V11.3 auf. Die bestehende Bibliothek, die manuelle
Reihenlogik, der Scanner und die Sicherheitsfunktionen bleiben erhalten.

Der neue Button „✦ Bibliotheksmodus“ öffnet eine immersive Präsentation der
eigenen Sammlung. Der Modus zeigt alle Bücher, die zu deinen eigenen Reihen
gehören, und blendet Dashboard, Suchleiste und Verwaltungsfunktionen aus.

### Bedienung
- Zurück: jederzeit zur normalen Ansicht wechseln.
- Regal-Auswahl: direkt zu einer Reihe springen.
- Pfeile: vorheriges oder nächstes Regal.
- Cover / Buchrücken: Ansicht wechseln, ohne die normale Einstellung zu ändern.
- Licht: Warm, Mondlicht oder Aus.
- Vollbild: optional, sofern der Browser die Fullscreen-API unterstützt.
- Buch anklicken: die gewohnten Buchdetails öffnen.
- Tastatur: Pfeil links/rechts für die Regalnavigation; Escape zum Verlassen,
  sofern kein Dialog geöffnet ist.

Beim Verlassen werden die vorherige Suche, Filter, Gruppierung, Ansicht und
Scrollposition wiederhergestellt. Die Lichtauswahl wird lokal gespeichert.

### Smartphone
Der Bibliotheksmodus funktioniert ohne Fullscreen-API. Auf iPhones kann die
Vollbild-Schaltfläche je nach Safari-Version nicht verfügbar sein. Wird die
Website zum Home-Bildschirm hinzugefügt, kann die installierte Web-App ohne
die normale Safari-Adressleiste geöffnet werden. Kein Vollbild wird erzwungen.

### Animationen
Die bestehende Atmosphäre bleibt erhalten. Bei eingeschalteter
Bewegungsreduzierung oder deaktivierter Atmosphäre werden Parallax-Bewegungen
ausgeschaltet. Animationen sind für die Bedienung nicht erforderlich.

## Update-Anleitung
1. Vor dem Update ein aktuelles JSON-Backup erstellen und in iCloud Drive speichern.
2. Die fünf Dateien aus diesem ZIP im GitHub-Repository ersetzen.
3. Änderungen committen und GitHub Pages aktualisieren lassen.
4. Die bestehende Website neu laden. Oben muss V12 stehen.
5. Bibliotheksmodus über den neuen Button öffnen.

Die Website-Daten nicht löschen und die installierte App nicht deinstallieren,
da die Sammlung lokal gespeichert ist. Cloudflare muss nicht geändert werden.
