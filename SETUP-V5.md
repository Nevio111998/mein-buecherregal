# Mein Bücherregal V5 – externe Buchdatenbank

Diese Version hat **keine fest eingebauten Bücher mehr**.

## Architektur

Die App auf GitHub Pages bleibt kostenlos und speichert deine Sammlung lokal.
Für die Buchsuche wird ein kostenloser Cloudflare Worker verwendet.

Der Worker fragt nacheinander:

1. K10plus (Bibliothekskatalog, besonders nützlich für deutschsprachige Druckausgaben)
2. Google Books
3. Open Library

Das löst auch das CORS-/Browserproblem, weil GitHub Pages selbst keine Serverlogik ausführen kann.

---

## A. App auf GitHub aktualisieren

Wie bisher alle Dateien des PWA-Ordners in dein Repository `mein-buecherregal` hochladen
und die alten Versionen ersetzen.

Für die Website relevant:
- index.html
- sw.js
- manifest.webmanifest
- icon.svg

Danach Commit und GitHub Pages kurz aktualisieren lassen.

---

## B. Kostenlosen Cloudflare Worker erstellen

1. Öffne https://dash.cloudflare.com/
2. Kostenloses Konto erstellen/anmelden.
3. Zu **Workers & Pages** gehen.
4. **Create** / **Create Worker** wählen.
5. Einen Namen vergeben, z. B. `mein-buecherregal-api`.
6. Worker erstellen.
7. Im Code-Editor den vorhandenen Beispielcode komplett löschen.
8. Den gesamten Inhalt aus `book-api-worker.js` einfügen.
9. **Deploy** drücken.
10. Danach erhältst du eine Adresse ähnlich:
   `https://mein-buecherregal-api.DEINNAME.workers.dev`

---

## C. Worker mit der Bücher-App verbinden

1. Deine Bücherregal-App öffnen.
2. Oben auf **⚙ Datenquelle** klicken.
3. Die Worker-URL einfügen.
4. **Verbindung testen**.
5. Wenn `Verbindung funktioniert ✓` erscheint, **Speichern**.

Ab dann läuft `ISBN suchen` zuerst über K10plus und danach über weitere externe Buchdatenbanken.

---

## Wichtig

Deine vorhandenen Bücher werden dadurch nicht gelöscht.
Sie liegen weiterhin unter demselben localStorage-Schlüssel im Browser.

Der Worker speichert keine Büchersammlung. Er dient nur als Such-Vermittler zu externen Katalogen.
