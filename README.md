# Mein Bücherregal – V15.9.3

## Figuren-Atlas & Beziehungsnetz

Diese Version baut auf V15.9.2 auf und verbessert ausschliesslich die Darstellung und Bedienung des Charakter- & Beziehungsnetzes. Alle bisherigen Bücher, Sammlungen, Reihen, Journale, Lese-Sessions, Chronik-Einträge, Figuren und Beziehungen bleiben erhalten.

### Neu

- Figuren-Atlas als übersichtliche Startansicht mit responsiven Gruppen-Karten.
- Suche nach Name, Rolle oder Fraktion und Filter für einzelne Gruppen.
- Figur anklicken: direktes Beziehungsnetz öffnen und die ausgewählte Figur fokussieren.
- Verbindungen zur ausgewählten Figur werden zusätzlich in einer lesbaren Liste angezeigt; andere Figuren lassen sich darüber direkt öffnen.
- Das vollständige Netz bleibt verfügbar, inklusive aller Linien, Zoom, Verschieben, Einpassen, 1:1 und Grossansicht.
- Neue, kompakte Graph-Anordnung mit getrennten Gruppenüberschriften und mehr Platz für die Figurenkarten.
- Verbesserte Darstellung auf schmalen Handybildschirmen.
- Die Initialisierung des Charakter-Moduls wurde korrigiert, damit auch Einträge mit fehlenden Zeitstempeln geladen werden können.

Die Gruppierung verwendet ausschliesslich deine vorhandenen Fraktions- und Rollenangaben. Sie verändert keine Namen und führt keine Fraktionen automatisch zusammen. Alle neuen Ansichts- und Filtereinstellungen sind rein lokal im laufenden Fenster und werden nicht in die Bibliotheksdaten geschrieben.

### Installation

1. Vor dem Update ein aktuelles JSON-Backup erstellen und ausserhalb der App speichern.
2. Alle 12 Dateien aus dem GitHub-ZIP in das bestehende Repository hochladen und die bisherigen Dateien ersetzen.
3. Committen und warten, bis GitHub Pages die neue Version veröffentlicht hat. Die Versionsanzeige oben muss V15.9.3 zeigen.
4. Die App neu öffnen. Es ist keine Neueingabe und kein Import der Figuren notwendig.

Cloudflare muss nicht geändert werden. Bitte keine App, Browser- oder Website-Daten löschen. Die Daten liegen weiterhin lokal im Browser; dieses Update richtet keine Cloud-Synchronisierung ein.

### Technische Hinweise

- Character-Network-Speicher: `my_bookshelf_character_network_v1` (unverändert).
- Backup-Schema: 9 (unverändert).
- Keine Migration oder Änderung an der Struktur der gespeicherten Figuren und Beziehungen.
- Aktualisierter Service-Worker-Cache: `bookshelf-v15.9.3`.
- Die Dateien `character-network.js`, `character-network-layout.js` und `character-network.css` müssen zusammen mit der neuen `index.html` installiert werden.

Die Darstellung wurde mit synthetischen Daten und einem isolierten Chromium-Test sowie einem Start der vollständigen App geprüft. Ein Test auf deinem persönlichen iPhone war nicht möglich.
