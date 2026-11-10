# Mein Bücherregal

A personal digital bookshelf and reading journal, built mainly for my own use.

I read a lot of fantasy, especially long series with many characters, places and events. I wanted one place to keep track of my books, remember where I left off and collect notes about the worlds I'm reading about. So I made this little web app and keep adding things whenever I feel something is missing.

**[Open Mein Bücherregal](https://nevio111998.github.io/mein-buecherregal/)**

The app itself is in German. It's made around my own reading habits, but anyone who finds it is welcome to try it.

## What you can do

- **Bookshelf:** Keep your books together in a personal library.
- **Series and collections:** Organise books into series and collections, including your own reading order.
- **Reading journal:** Write down your thoughts and notes as you read.
- **Reading sessions:** Keep a record of your reading activity.
- **Worldbuilding:** Save details about fictional worlds, places and factions.
- **Character atlas:** Collect information about characters and their connections.
- **Series timelines:** Create events for each series, such as battles, journeys, discoveries or important character moments. Move events up and down to put them in the order you want.
- **Linked notes:** Connect events with characters and books, add chapter or page references, tags and extra notes.
- **Spoiler protection:** Hide timeline details you don't want to see at a glance.
- **Search and filters:** Find books and timeline entries more easily.
- **Backup and restore:** Export your data as a JSON file and import it later.

Everything about the stories is entered manually. The app doesn't make up events, characters or book orders, and it doesn't automatically pull in spoilers.

## How it's built

It's a small web app made with **HTML, CSS and JavaScript**, hosted on **GitHub Pages**. It also includes a web app manifest and a layout designed to work on mobile screens.

The different parts of the app handle the bookshelf, reading sessions, worldbuilding, characters and timelines. For example, the timeline feature is split into:

- `world-timeline-core.js` — event data, sorting and import logic
- `world-timeline.js` — timeline interface and interactions
- `world-timeline.css` — timeline styling

There's also a Cloudflare Worker endpoint used by the project. Most importantly, **your own library and notes are kept in your browser**, not in this GitHub repository. No account is needed.

## Your data and backups

The app doesn't automatically sync between devices. Each browser keeps its own local data, so saving a backup is a good idea, particularly before clearing browser data or moving to another device.

Use **Sicherheit & Export** in the app to download a JSON backup. You can later restore it or merge it with an existing library. The backup includes the event timelines and their links to books and characters.

Older backups are supported. Importing an older backup without timeline information won't automatically erase a timeline you already have.

## Using it

Just open the [live app](https://nevio111998.github.io/mein-buecherregal/) and start adding your books.

If you prefer to run your own copy locally, clone or download the repository and start a local server in its folder:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Keep in mind that the local version and the GitHub Pages version use separate browser storage. If you want the same library in both, transfer it using a JSON backup.

## A small note

This is a personal side project that I update whenever I have an idea for something I'd like to use. It's not a commercial service, and there isn't any automatic cloud backup or syncing. If you use it for your own books, make regular backups so your notes stay safe.
