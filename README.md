# Mein Bücherregal – Version 14

Version 14 baut auf Version 13 auf.

## Neu: Lesejournal

Jedes Buch kann jetzt einen eigenen Journal-Eintrag bekommen:

- Gestartet am
- Beendet am
- Format: Papierbuch, E-Book, Hörbuch oder gemischt
- Gefühl: episch, düster, emotional, clever, gemütlich oder zäh
- kurze Rezension
- Lieblingszitat
- Lieblingsszene / stärkster Moment
- private Journal-Notizen

Du öffnest das Journal direkt in den Buchdetails über **📖 Journal**.

Wenn du ein Abschlussdatum setzt, wird das Buch automatisch als gelesen markiert.

## Neu: Jahresrückblick

Über **📖 Lesejournal** öffnest du die Jahresübersicht:

- gelesene Bücher pro Jahr
- gelesene Seiten
- einzigartige Autoren
- durchschnittliche Bewertung
- Top-Genre
- gespeicherte Lieblingszitate
- Monatsverteilung
- Liste aller abgeschlossenen Bücher
- Bücher, die als gelesen markiert sind, aber noch kein Abschlussdatum haben

Gezählt werden Bücher mit einem gepflegten Abschlussdatum.

## Backup

Das JSON-Backup wurde auf Schema 4 erweitert und enthält jetzt zusätzlich:

- alle Journal-Einträge
- Abschlussdaten
- Rezensionen
- Zitate
- private Journal-Notizen

Ältere Backups aus V13 und früher bleiben importierbar. Wenn ein Backup kein Lesejournal enthält, bleiben vorhandene Journal-Daten erhalten.

## Bleibt erhalten

- Sammlungen & Ausstellungsregale aus V13
- Bibliotheksmodus
- Buchanimation / Folio-Detailansicht
- manuelle Reihenlogik
- lokale Speicherung
- JSON Backup / Import / Zusammenführen
- Kamera / Schnellscan
- Cloudflare-Datenquelle

## Update

Nur GitHub Pages aktualisieren. Cloudflare bleibt unverändert.
