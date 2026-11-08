docker-compose.yaml          Local multi-service deployment
# Memoix Mobile

Memoix is an offline-first journal for recording notes and expenses in a shared timeline. Entries are ordinary text with optional `#tag`, `@person`, and `&place` markers. Memoix links those markers to searchable entities, so entries can be revisited by date or by the people, tags, and places they mention.

This repository's documented product is the Expo mobile app in [`mobile/`](./mobile/). It does not require an account or a backend service: the app stores its data in a SQLite database on the device. It does not currently sync data between devices.

## Features

- **Memories:** Create, edit, and delete notes or expenses. Each entry has editable date and time; an expense also has a non-negative amount, with up to 15 integer digits and 2 decimal places.
- **Entity linking:** When an entry is saved, the app extracts `#tags`, `@people`, and `&places` from its text and stores their links separately. The markers remain part of the entry text. Matching supports Unicode letters and numbers and underscores.
- **Search and filters:** Filter the timeline by date range and entity markers. This is entity-based filtering, not arbitrary full-text search. If a query contains several markers, an entry must match all requested markers.
- **People and tags:** Browse, search, create, and edit people and tags. Person profiles include a mention key, optional name, description, birthdate, phone number, and avatar. Avatars are stored locally in the database. Renaming a person or tag also updates its marker in linked entries; duplicate keys or names are rejected.
- **Memory analytics:** Review activity by calendar date and statistics about the time between entries, including mean, median, and standard deviation.
- **Expense analytics:** Inspect daily totals over a selected date range, select a day to see its expenses, and compare the most-used tag and person combinations.
- **Appearance:** Choose among four built-in themes.
- **Backup and restore:** Export a portable SQLite `.db` backup and restore a validated Memoix database. Restore replaces the app's current local data.

## Data and privacy

The app's SQLite database is the source of truth. It contains entry text, type, amount when applicable, timestamp, people, tags, places, and the association tables that connect entries to those entities. Person avatar image data and app settings are local as well. There is no sign-in, server API, or automatic cloud backup in the current app.

Backups are not encrypted. Keep exported files somewhere private. On Android, the app can save backups to a folder selected by the user; on iOS, it exports through the system share sheet. Restore checks database integrity, required tables, and schema-version compatibility before replacing live data, and attempts to recover the prior database if the replacement fails. Uninstalling the app or losing the device can remove data that has not been backed up.

## Development

### Requirements

- Node.js 22.13 or later (required by Expo SDK 58)
- npm
- An Android or iOS device or emulator for native testing

### Start the app

```sh
cd mobile
npm ci
npm start
```

Use the Expo CLI prompts to open the app on a connected device or emulator. `npm run android` and `npm run ios` launch platform-specific native runs when the corresponding development toolchain is installed.

### Checks

Run these commands from `mobile/`:

```sh
npm run typecheck
npm run lint
```

## Implementation map

```text
mobile/src/app/          Expo Router route definitions and tab navigation
mobile/src/screens/      Screen-level workflows
mobile/src/components/   Reusable React Native UI components
mobile/src/database.ts   SQLite schema, queries, writes, and backup/restore
mobile/src/domain.ts     Data types, entity parsing, filtering, and statistics
mobile/src/theme.ts      Theme palettes and theme context
```

The app uses Expo SDK 58, React Native 0.88, React 19, TypeScript, Expo Router, and Expo SQLite. The database is initialized locally by the app; no server or environment configuration is required to run it.
