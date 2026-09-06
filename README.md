# Mein Bücherregal – Version 9.1

Logik-Fix für Reihen-Intelligenz.

## Behoben
- kein unmögliches `8 / 5 Bände` mehr
- externe Suche darf die höchste gefundene Bandnummer nicht mehr als Gesamtzahl ausgeben
- "vollständig bestätigt" nur noch bei einer von dir bestätigten Gesamtzahl
- neue Stufe "vermutlich vollständig"
- Gesamtzahl unbekannt bleibt ehrlich unbekannt
- Lücken in der lokalen Bandnummerierung werden erkannt
- doppelte Bandnummern werden markiert
- ungültige / komische Bandnummern werden markiert
- Kategorien wie "Trading" oder "Mindset" werden nicht mehr automatisch als echte Reihe angezeigt,
  solange keine sinnvolle Bandnummerierung / externe Evidenz existiert
- Reihe kann man manuell als "nicht als Reihe behandeln" markieren

## Status
- ✓ Vollständig bestätigt
- ≈ Vermutlich vollständig
- ? Gesamtzahl unbekannt
- ⚠ Konflikt / Lücke

## Wichtig
Eine externe Datenbank kann zuverlässig einzelne Bände entdecken, aber nicht immer sagen,
wie viele Bände eine Reihe endgültig hat. Deshalb trennt V9.1 jetzt:
"extern beobachtete Bandnummern" von einer wirklich bestätigten Gesamtzahl.
