# My Bookshelf (Mein Bücherregal)

**A personal reading companion and worldbuilding journal — built for the way I read.**

I created *Mein Bücherregal* as a personal project to keep track of my books, reading progress and favourite fantasy universes in one place. A conventional reading list wasn't enough: I also wanted to remember characters, places, important events and the connections between stories without losing my own notes or running into unwanted spoilers.

The result is a continuously evolving, browser-based application that combines a digital bookshelf with reading journals, series organisation and a personal knowledge base for fictional worlds.

**[Open the live application](https://nevio111998.github.io/mein-buecherregal/)** · Interface language: German

## What can you do with it?

- **Personal bookshelf:** Organise books and maintain a library with searchable entries and reading-related information.
- **Series and collections:** Group books into manually managed series and collections rather than relying on automatically guessed reading orders.
- **Reading journal:** Keep personal notes and document thoughts about books while reading.
- **Reading sessions:** Record individual reading sessions and follow your reading activity.
- **Worldbuilding notes:** Organise information about the fictional worlds you explore.
- **Character atlas:** Keep track of characters and their relationships to series and stories.
- **Event timelines:** Build a separate chronological timeline for each series, with events such as battles, journeys, alliances, discoveries and character developments.
- **Cross-referenced details:** Connect timeline events to existing characters and optionally record source books, chapter/page references, locations, factions, tags and importance.
- **Search and filters:** Find timeline entries by text, event type or associated character; hide spoilers when needed.
- **Personalisation:** Add decorative and organisational details to make the library feel like your own space.
- **Backup and restore:** Export your collection as JSON and import it again, including the interconnected world and timeline information.

All story events and descriptions are entered by the user. The application does **not** generate fictional lore, reading orders or plot information automatically.

## Why I built it

I enjoy long fantasy series with large casts, complex histories and interconnected worlds. As a reader, I wanted more than a list of books marked *read* or *unread*: a place to preserve the details I care about and return to them months later.

This project started as a tool for my own reading habits and grew feature by feature. It also became a practical exercise in frontend development, structured data modelling, state management and building reliable import/export workflows.

## Technology and architecture

The application is delivered as a lightweight web app through **GitHub Pages**. Its interface is built with **HTML, CSS and JavaScript**, with progressive-web-app metadata for a more app-like experience on supported devices.

| Area | Implementation |
| --- | --- |
| Frontend | HTML, CSS and vanilla JavaScript |
| Deployment | GitHub Pages |
| App-like experience | Web app manifest and mobile-oriented UI |
| Data | Browser-local storage and JSON backup files |
| Domain model | Books, series, collections, characters, worldbuilding notes and events |
| Timeline module | `world-timeline-core.js`, `world-timeline.js` and `world-timeline.css` |
| External integration | A separately configured Cloudflare Worker endpoint |

The application is designed around **personal, locally stored data** rather than user accounts or a central online library. It does not automatically synchronize reading data between devices.

### Technical challenges

**Preserving existing data while adding features.** New modules must work with previously saved libraries and older backup formats. The current backup uses schema version 10; older imports remain supported.

**Safe merging and ID conflicts.** Import logic supports merging and replacing data. When imported timeline records collide with existing IDs, it avoids silently overwriting unrelated entries.

**Maintaining relationships.** Timeline events may reference books and characters. During import, the application attempts to reconnect those references using stable IDs and identifying details, while preserving historical names when a target is unavailable.

**Keeping the timeline user-controlled.** Events can be inserted, reordered, edited and filtered. Their chronology comes from the reader rather than an external database or an automatically inferred order.

**Handling storage failures.** The backup/import implementation includes validation and recovery logic intended to avoid leaving partially applied changes when storage operations fail.

## Run locally

Clone or download this repository and serve its files from the project root using a local HTTP server, for example:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. You can also try the published version through the live-app link above.

**Important:** Browser storage is tied to its origin and browser profile. Local development and the GitHub Pages version do not automatically share the same library. Export a backup from the original installation before switching devices, browsers or origins.

## Data ownership and backups

Personal library entries, notes and timelines are stored in the browser. The application provides a JSON backup that includes the world-event timeline (stored locally under `my_bookshelf_world_timeline_v1`) and related application data.

- **Export** a full backup before major changes or clearing browser data.
- **Merge** incoming data with existing entries, retaining existing records and resolving conflicting IDs.
- **Replace** data through the supported import process when a full restoration is intended.
- **Older backups** remain readable; a backup without a timeline section does not erase an existing timeline simply because that section is absent.
- **No automatic device sync:** Backups must be transferred manually when moving to a new browser or device.

The GitHub Pages website hosts the application code, not a copy of each visitor's personal library.

## Verification and limitations

During development, JavaScript syntax, timeline data logic, example-library interactions, mobile dialog behaviour and backup merge/replace/error-recovery scenarios were checked in a controlled test environment. These checks should not be confused with a comprehensive automated cross-browser test suite.

The earlier development test environment could not directly run a localhost browser integration test, and a production iPhone/GitHub Pages test was not documented there. Real-device compatibility should therefore be verified separately rather than assumed from those checks.

This is primarily a **personal project**, not a commercial reading platform. It has no built-in account system or automatic multi-device synchronisation, and user-generated notes depend on the browser's local storage unless backed up.

## Project direction

I continue to shape this application around my own reading experience, prioritising practical features, data portability and careful evolution of the existing library over unnecessary complexity.

The main engineering lesson is that even a personal tool benefits from clear data models, backwards compatibility and thoughtful treatment of user data.
