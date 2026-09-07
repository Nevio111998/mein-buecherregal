# Mein Bücherregal – V15.7

Diese Version baut auf der vorhandenen V15.6 auf. Alle Buch-, Reihen-, Sammlungs-, Journal- und Dekorationsfunktionen bleiben bestehen.

## Lese-Sessions

Über „⏱ Lese-Session“ oder direkt aus den Buchdetails kannst du einen Timer starten, pausieren, fortsetzen und eine Session speichern. Der Timer verwendet Zeitstempel, damit ein Neuladen nicht bei null beginnt. Pausen werden nicht als Lesezeit gezählt. Ein laufender Timer zählt auch weiter, wenn die App geschlossen wird; prüfe und korrigiere daher die Dauer vor dem Speichern.

Du kannst Seiten von/bis, Notizen und ein Abschlussdatum erfassen oder eine Session manuell nachtragen. Das Aktualisieren des Buchfortschritts ist optional. Die Verlaufsliste zeigt Zeiten, Seiten und Notizen; Bearbeiten oder Löschen verändert den Buchfortschritt nicht rückwirkend.

## Backup und Sicherheit

Schema 6 enthält die gespeicherten Sessions sowie eine eventuell aktive Session als pausierten, wiederherstellbaren Entwurf. Backups ohne Session-Daten lassen bestehende Session-Daten erhalten. Ein Import mit Session-Daten wird abgelehnt, wenn eine aktuelle aktive Session dadurch überschrieben würde. Vor einem Ersetzen weiterhin zuerst ein JSON-Backup ausserhalb der App speichern.

Die Session-Daten nutzen eigene lokale Speicherschlüssel. Es gibt keine Cloud-Synchronisation. Cloudflare bleibt unverändert.

## GitHub-Update

Die sieben Dateien im ZIP im bestehenden Repository ersetzen bzw. ergänzen und committen. Die beiden neuen Dateien reading-sessions.js und reading-sessions.css müssen mit hochgeladen werden. Alle bisherigen Website-Daten erhalten.
