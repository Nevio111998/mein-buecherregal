# Mein Bücherregal – Version 9.2

## Reihenlogik komplett manuell

Externe Buchdatenbanken werden weiterhin für:
- Titel
- Autor
- Cover
- Metadaten

verwendet.

Sie haben aber **keinen Einfluss mehr auf Reihen-Vollständigkeit oder Reihenlänge**.

## Neue Logik
- Gesamtzahl einer Reihe legst ausschließlich du fest.
- Vollständigkeit zählt physische Bücher im Regal, nicht gelesene Bücher.
- Ungelesene Bücher zählen als vorhanden.
- Lesefortschritt wird separat angezeigt.
- Das Feld `Band` dient nur für Reihenfolge und Beschriftung.
- Deutsche Aufteilungen / Teilbände lösen keine falschen Warnungen mehr aus.
- Keine externe Bandprüfung.
- Keine automatisch erkannten fehlenden Bandnummern.
- Kategorien mit weniger als 2 physischen Büchern verschwinden aus der Reihenübersicht,
  sofern du keine manuelle Gesamtzahl setzt.

Beispiel:
Red Rising: 8 / 8 im Regal = vollständig.
Davon 4 / 8 gelesen = 50 % gelesen.
