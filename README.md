# Mein Bücherregal – V15.7.1

Diese Version ist ein gezieltes Update der Lese-Sessions auf Basis von V15.7. Alle bisherigen Buch-, Reihen-, Sammlungs-, Journal-, Deko- und Sessionfunktionen bleiben erhalten. Cloudflare muss nicht geändert werden.

## Fortschrittsübernahme

Trage beim Abschliessen einer Session die tatsächliche Endseite ein und lasse „Lesefortschritt im Buch aktualisieren“ aktiviert. Die Vorschau zeigt den bisherigen und den neuen Buchstand. Nach dem Speichern wird der neue Seitenstand ausdrücklich bestätigt. Ein vorhandener höherer Fortschritt wird nicht zurückgesetzt. Wird ein Buch ausdrücklich als gelesen abgeschlossen, wird bei bekannter Gesamtseitenzahl die letzte Seite gesetzt. Ohne Endseite wird eine normale Fortschrittsübernahme mit einer verständlichen Meldung abgelehnt; zum reinen Speichern der Lesezeit kann das Häkchen entfernt werden.

Im Session-Verlauf gibt es „Fortschritt übernehmen“ für vorhandene Einträge mit Endseite. Nach Bestätigung wird der Buchstand übernommen, ohne die Session zu duplizieren oder den Verlauf zu verändern. So können bereits gespeicherte Sessions nachträglich abgeglichen werden. Das Bearbeiten oder Löschen einer alten Session verändert den Buchfortschritt weiterhin nicht automatisch.

## Daten und Installation

Die bestehenden lokalen Speicherschlüssel und Backup-Schema 6 bleiben unverändert. Es werden keine bestehenden Sessions migriert oder gelöscht. Vor dem Update ein aktuelles JSON-Backup ausserhalb der App sichern. Anschliessend alle sieben Dateien aus dem ZIP im bestehenden GitHub-Repository ersetzen und committen. Insbesondere `reading-sessions.js` und `reading-sessions.css` müssen mit hochgeladen werden. Die Versionierung des Service Workers und der Assets wurde auf 15.7.1 angehoben. Keine Website-Daten löschen.
