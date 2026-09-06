# Mein Bücherregal – V13

## Schritt 3: Eigene Sammlungen und Ausstellungsregale

V13 baut auf V12.3 auf. Deine Bücher, die manuelle Reihenlogik, der Scanner, die Buchanimation und der Bibliotheksmodus bleiben erhalten.

- Erstelle persönliche Ausstellungen wie „Meine Top 10“, „Dark Fantasy“ oder „Als Nächstes lesen“.
- Wähle Bücher aus deiner bestehenden Bibliothek. Ein Buch kann in mehreren Sammlungen stehen, ohne dupliziert zu werden.
- Ändere Reihenfolge, Schildtext, Titelbild und den Stil des Ausstellungsregals.
- Öffne Sammlungen als Cover- oder Buchrückenregal; die normalen Reihenansichten bleiben unabhängig.
- Im Bibliotheksmodus kannst du zwischen Reihen und Sammlungen wechseln.
- Im Buchdetail gibt es „Zu Sammlung“, um ein Buch direkt in eine oder mehrere Ausstellungen aufzunehmen.
- Eine gelöschte Sammlung löscht keine Bücher. Fehlende Buchverweise bleiben erkennbar und können im Editor entfernt werden.

## Datensicherheit

Die Sammlungen werden separat unter `my_bookshelf_collections_v1` gespeichert. Sie enthalten nur Metadaten und Buch-IDs, keine zusätzlichen Buchkopien. Das neue JSON-Backup (Schema 3) enthält alle Bücher, die manuellen Reihen-Einstellungen, Sammlungen und wichtige App-Einstellungen. Alte Backups bleiben importierbar.

Bei einem alten Backup ohne Sammlungen bleiben vorhandene Sammlungen erhalten. Beim Zusammenführen werden neue Buch-IDs den vorhandenen Datensätzen zugeordnet und Sammlungsverweise entsprechend angepasst. Bei Namens-/ID-Konflikten bleiben bestehende Sammlungsdaten vorrangig. Vor dem Ersetzen wird eine Sicherheitskopie zum Download angeboten. Prüfe unbedingt, dass sie ausserhalb der App gespeichert ist.

## Installation

1. Vor dem Update ein aktuelles JSON-Backup erstellen und in iCloud Drive sichern.
2. Die fünf Dateien aus diesem ZIP im bestehenden GitHub-Repository ersetzen und committen.
3. GitHub Pages neu laden, bis V13 erscheint. Keine Website-Daten löschen und die PWA nicht deinstallieren.
4. Über „✦ Sammlungen“ die erste Ausstellung erstellen.

Cloudflare muss nicht geändert werden. Es gibt weiterhin keine automatische Cloud-Synchronisierung. Die Kamera wurde nicht auf einem echten iPhone getestet.
