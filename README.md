# Mein Bücherregal — V16.0

Die Chronik der Welten ergänzt die funktionierende V15.9.3. Bücher, manuell gepflegte Reihen, Sammlungen, Journal, Lese-Sessions, Worldbuilding, Figuren-Atlas und Deko bleiben unverändert.

## Neu: Ereignis-Chronik

- Eine eigene, vertikale Zeitleiste pro manuell benannter Reihe.
- Ereignisse in beliebiger Anzahl innerhalb der Speichergrenzen des Geräts anlegen, bearbeiten und löschen.
- Freie chronologische Reihenfolge: Position beim Anlegen wählen oder später mit ↑ und ↓ verändern. Es werden keine Daten, fehlenden Bände oder Reihenfolgen automatisch erfunden.
- Ereignistypen: Ereignis, Schlacht, Reise, Bündnis & Politik, Enthüllung, Charakterereignis, Magie & Welt und Sonstiges.
- Titel, ausführliche Beschreibung, persönliche Notizen, Tags und Wichtigkeit.
- Optionaler Quellband, Kapitel/Seite und frei formulierter Zeitpunkt innerhalb der Geschichte.
- Orte und Fraktionen frei eintragen; vorhandene Einträge aus der Reihen-Chronik werden als Vorschläge angeboten.
- Mehrere bestehende Charaktere aus dem Figuren-Atlas verknüpfen. Keine doppelte Erfassung nötig.
- Suche, Typ- und Figurenfilter, Spoiler-Verdeckung und „Speichern & weiteres Ereignis“.
- Zugriff über das obere Menü, Buchdetails und die Reihenübersicht.
- Alle Texte stammen ausschliesslich von dir; keine externen Ereignisse oder Spoiler werden geladen.

## Daten & Backup

Die Ereignisse werden separat unter `my_bookshelf_world_timeline_v1` im lokalen Speicher gespeichert. Die App hat weiterhin keine automatische Synchronisation zwischen Geräten. Das JSON-Backup enthält die vollständige Ereignis-Chronik und verwendet Schema 10. Ältere Backups bleiben lesbar; ein Backup ohne Ereignisbereich löscht beim Import keine vorhandene Chronik. Beim Zusammenführen bleiben vorhandene Einträge erhalten, und ID-Konflikte werden ohne Überschreiben behandelt. Buch- und Figurenverknüpfungen werden beim Import möglichst über stabile IDs und Identitäten zugeordnet; historische Namen und Quellen bleiben erhalten, wenn ein Ziel nicht mehr existiert.

## Installation

1. In der aktuellen App unter „Sicherheit & Export“ ein vollständiges JSON-Backup erstellen und ausserhalb der App, beispielsweise in iCloud Drive, speichern.
2. Das ZIP entpacken und **alle 15 Dateien** direkt in das bestehende GitHub-Repository hochladen. Die neuen Dateien sind `world-timeline-core.js`, `world-timeline.js` und `world-timeline.css`.
3. Änderungen committen und die GitHub-Pages-Veröffentlichung abwarten. Danach die Seite neu öffnen und die angezeigte Version V16.0 prüfen.
4. Cloudflare muss nicht geändert werden. Bitte weder die App löschen noch Website-Daten leeren, um ein Update zu erzwingen.

GitHub Pages: https://nevio111998.github.io/mein-buecherregal/
Cloudflare Worker (unverändert): https://mein-buecherregal-api.neviodipalma.workers.dev

## Testhinweis

Die JavaScript-Syntax, Datenlogik, eine vollständige App mit Beispielbibliothek, der mobile Dialog sowie Backup-Zusammenführen, Ersetzen und Rücksetzung bei simuliertem Speicherfehler wurden geprüft. Der direkte Aufruf über localhost war in der Testumgebung administrativ gesperrt; die Browser-Integration wurde deshalb mit vollständig eingebetteten lokalen App-Dateien und isoliertem Beispielspeicher getestet. Ein echter iPhone- oder produktiver GitHub-Pages-Test wurde nicht durchgeführt.
