# Mein Bücherregal – V15.8.2

## Fehlerbehebung: Typ-Auswahl

Die beim Umbau auf die Reihen-Chronik versehentlich entfernten Auswahloptionen sind wieder vorhanden: Zitat, Charakter, Ort, Fraktion und Lore / Worldbuilding. Die Auswahl bleibt beim Bearbeiten und bei „Speichern & weiterer Eintrag“ erhalten.

Die Reihen-Chronik bleibt ansonsten unverändert. Alle bestehenden Einträge, Bücher, Sammlungen, manuellen Reihen, Lese-Sessions, Journale und Dekorationen bleiben erhalten. Backup-Schema 8 und der bestehende lokale Speicherschlüssel werden weiterverwendet. Es ist keine Datenmigration erforderlich.

## Installation

Vor dem Update ein aktuelles JSON-Backup ausserhalb der App speichern. Alle neun Dateien aus dieser ZIP ins bestehende GitHub-Repository hochladen und committen. Keine Website-Daten löschen. Die Cloudflare-API bleibt unverändert.

Der Service-Worker-Cache wurde auf V15.8.2 aktualisiert, damit die PWA die korrigierte JavaScript-Datei lädt.
