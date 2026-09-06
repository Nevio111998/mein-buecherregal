# Mein Bücherregal – Version 6

Fixes:
- Titelsuche sendet eine vorhandene ISBN als Editions-Hinweis an den Worker.
- Dadurch werden bei Titel-Treffern nicht mehr versehentlich Cover einer anderen Ausgabe verwendet.
- Worker v4 sucht Cover über:
  1. Google Books (exakte ISBN)
  2. Google Books (Titel + Autor)
  3. Google Play Books
  4. Open Library (nur exakte ISBN und nur wenn das Bild wirklich existiert)
- Lange K10plus-Katalogtitel werden für die Cover-Suche auf den Haupttitel reduziert.
