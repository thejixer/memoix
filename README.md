# Memoix

Memoix is a personal, searchable journal that combines free-form notes, tagged expenses, people, and places in one chronological timeline. It lets a user record an event in their own words, relate it to people/tags/places, revisit it through filters, and review activity and spending statistics.

The repository retains the original React web client and Go API as a behavior reference, and now also contains a standalone React Native / Expo mobile app in `mobile/`. The mobile app is an offline-first rebuild using SQLite; it does not use the old backend or require authentication.

## Mobile app

The Expo app is in [`mobile/`](./mobile/). It keeps the black-and-neon-green terminal look and includes:

- A combined timeline of `memo` and `expense` entries, with edit/delete, date filters, and entity-only search using `#tags`, `@people`, and `&places`.
- Memory analytics with a recent-activity heatmap and occurrence-gap statistics.
- People directory and editable person profiles (full name, mention key, description, birthdate, phone, and locally stored avatar).
- A tag directory with editable names.
- Expense analytics with a selectable daily line chart and top-20 composite tag/person charts.
- Portable SQLite backup export and validated restore. Restoring replaces the current local data. Avatar image data is stored in SQLite so it travels in the backup.
- No sign-in or network-dependent features. Data is stored locally on the device.

### Develop

```sh
cd mobile
npm ci
npm start
```

Run `npm run typecheck` to type-check the app. Open the Expo development build on an Android device/emulator to use the native SQLite, date picker, and image-picker features.

### Build and download an APK

The [Build Android APK workflow](./.github/workflows/build-android-apk.yml) runs on pushes to `mobile-app` that change mobile files, and can also be started manually in GitHub Actions with **Run workflow**. Download the `memoix-android-apk` artifact from the completed workflow run. Artifacts are retained for 30 days.

## Original web application

The sections below document the original web/API behavior retained in this repository. They are useful as historical context for the mobile rebuild.

## What the application does

3

### Sign-in and personal data

- Users sign in with an Iranian phone number using a four-digit, one-time code.
- The first successful verification creates the user account; later verifications sign in to that account.
- The web client stores the returned JWT in a cookie for 30 days and sends it as `Authorization: ut <token>`.
- Each user's notes, expenses, people, tags, and places are scoped to that user.
- Authenticated pages are the dashboard, people directory, person profiles, add-person screen, and memories screen. The root page redirects to memories when a token exists, otherwise to login.
- The authenticated navigation provides Dashboard, Memories, Persons, and Logout.

**Current OTP limitation:** SMS delivery is a stub (`SendSMS` does not send a message). In `DEV` and `TEST`, the generated code is always `1111`; outside those modes the server generates a random code, but an SMS provider must be integrated for users to receive it.

### Memories: notes, expenses, and search

- Create a **note** with text and a chosen date/time.
- Create an **expense** with text, a decimal amount (up to 15 digits and 2 decimal places), and a chosen date/time. Amounts are labeled in Tomans in the interface.
- Both kinds of entry appear together in reverse-chronological order. Expense rows display their amount; opening an entry shows its full text and date.
- Notes can be deleted after confirming by typing `delete`. There is no expense delete or edit endpoint in the current API.
- Dates can be backdated. Date filters support a start (`since`) and/or end (`until`) date; the interface expands the selected dates to their local-day boundaries.
- Search is based on recognized entities in the query, rather than arbitrary full-text matching:
  - `#tag` filters by hashtag.
  - `@person` filters by a person mention.
  - `&place` filters by a place.
  - When a query includes multiple entities, matching entries must contain every selected entity.
- The search field and note/expense editor offer suggestions for people, tags, and places. Suggestions are fetched as the user types and can be selected with the keyboard or mouse.
- Top tags and top mentions are shown for the current search/date filter. Selecting one adds it to the filter. A clear-filters button resets the query and date range.
- The Memories screen has **memo** and **analytics** tabs. Analytics includes:
  - An activity heatmap covering approximately the last year.
  - Count of matching notes and expenses, first/last occurrence, and average, median, minimum, maximum, and standard-deviation gaps between occurrences.
- `Ctrl+A` opens the create-entry dialog. `Ctrl+Q` focuses the search input.

### People directory and profiles

- Add a person, browse the directory, and open an individual profile.
- People can be created explicitly from the directory or automatically when a new note/expense mentions a person not already in the user's directory.
- A profile shows the person's avatar, optional phone number, frequently associated tags and mentions, and entries mentioning them.
- Update a person's name or phone number, or upload an avatar.
- Renaming a person updates their `@mention` text in that user's existing notes and expenses.
- Avatar files are stored by the backend and served from its `public` directory. The web client uses a default logo when no avatar is available.

### Expense dashboard

- Choose a date range to view spending. The initial range starts at the previous Saturday and ends at the current date.
- The dashboard aggregates expenses into daily totals and fills missing days with zero in the client.
- Summary cards show total, mean, median, standard deviation, maximum daily total, and minimum daily total.
- A bar chart shows expense totals grouped by each expense's complete set of tags; a line chart shows daily spending.
- Selecting a point on the daily chart displays that day's total and associated top tags/mentions.

## Data and entity model

Text is stored as entered. On note/expense creation, the server extracts unique tokens matching `#\w+`, `@\w+`, and `&\w+` and stores their associations separately:

- Tags and places are shared between the user's notes and expenses.
- A mention associates the entry with a person. The marker is omitted from the stored person's name.
- Entry content, its date/time, and expense amount (for expenses) remain part of the entry.

The database schema is created by the backend at startup if it does not already exist. It includes users, notes, expenses, people, tags, places, and join tables linking entries to those entities. Redis temporarily stores OTPs; each code expires after three minutes and is removed after successful verification.

## HTTP API

The API listens on port `4848` by default. Except for `GET /` and the two OTP endpoints, routes require the authorization header `Authorization: ut <JWT>`.

| Method   | Path                    | Purpose                                                                                                 |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET`    | `/`                     | Basic hello/health response.                                                                            |
| `POST`   | `/auth/request-otp`     | Request a sign-in code; JSON body: `{"phone_number":"..."}`.                                            |
| `POST`   | `/auth/verify-otp`      | Verify a code; JSON body: `{"phone_number":"...","otp":"..."}`; returns a JWT.                          |
| `GET`    | `/auth/me`              | Return the authenticated user.                                                                          |
| `POST`   | `/note/`                | Create a note; body: `content`, `date` (RFC 3339).                                                      |
| `GET`    | `/note/`                | Get the combined notes/expenses timeline. Optional query: `query`, `since`, `until`.                    |
| `DELETE` | `/note/:id`             | Delete an authenticated user's note.                                                                    |
| `GET`    | `/tag/top-tags`         | Get the top 10 tags in the matching entries. Optional query: `query`, `since`, `until`, `mode`.         |
| `GET`    | `/tag/`                 | Suggest/search tags by `text`; optional `page` and `limit`.                                             |
| `GET`    | `/mention/top-mentions` | Get the top 10 people mentioned in matching entries. Optional query: `query`, `since`, `until`, `mode`. |
| `GET`    | `/place/`               | Suggest/search places by `text`; optional `page` and `limit`.                                           |
| `GET`    | `/stats/`               | Get occurrence dates and gap statistics. Optional query: `query`, `since`, `until`.                     |
| `POST`   | `/expense/`             | Create an expense; body: `content`, `amount`, `date` (RFC 3339).                                        |
| `GET`    | `/expense/daily`        | Get daily expense totals; requires both `since` and `until`.                                            |
| `GET`    | `/expense/by-tag`       | Aggregate expenses by their tag combinations; accepts `since` and `until`.                              |
| `POST`   | `/person/`              | Create a person; body: `{"name":"..."}`.                                                                |
| `GET`    | `/person/`              | List/search people by optional `text`; optional `page` and `limit`.                                     |
| `GET`    | `/person/:id`           | Get one person.                                                                                         |
| `POST`   | `/person/:id/avatar`    | Upload an avatar as multipart form field `avatar`.                                                      |
| `PATCH`  | `/person/`              | Rename a person; body: `old_name`, `new_name`.                                                          |
| `PATCH`  | `/person/phone`         | Update a person's phone; body: `id`, `phone_number`.                                                    |

`since` and `until` are RFC 3339 timestamps. Top-tag and top-mention routes accept `mode=note`, `mode=expense`, or `mode=both`; omitted or unrecognized values use `both`. `query` uses the entity markers described above.

## Technology and layout

- **Client:** React 19, React Router 7, Vite, Recharts, and `react-datepicker`.
- **API:** Go 1.23, Echo, and `database/sql`.
- **Persistence:** PostgreSQL; Redis is used for short-lived OTPs.
- **Deployment:** Docker Compose can run PostgreSQL, Redis, pgAdmin, the Go API, and an Nginx-served client.

```text
client/src/                  React routes, screens, components, and browser utilities
server/cmd/                  API executable entry point
server/internal/handler/     HTTP request handling
server/internal/service/     Application/business logic
server/internal/repository/  PostgreSQL queries and schema creation
server/internal/redis/       Redis-backed OTP storage
server/internal/models/      Entities and request/response DTOs
docker-compose.yaml          Local multi-service deployment
```

## Run locally

### Docker Compose

1. Copy the root `.env.example` to `.env` and set PostgreSQL credentials, PostgreSQL/Redis/pgAdmin ports, and the pgAdmin email/password values.
2. Configure `server/docker.env` using `server/.env.example` as a guide. Set `DB_HOST=db`, and set `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to match the PostgreSQL settings in the root `.env`. Set `REDIS_URI=redis:6379`, `LISTEN_ADDR=:4848`, `JWT_SECRET`, `ENCRYPTION_KEY`, and `ENVIRONMENT`. Use a valid base64-encoded AES key for `ENCRYPTION_KEY` (decoding to 16, 24, or 32 bytes).
3. From the repository root, run:

   ```sh
   docker compose up --build
   ```

4. Open `http://localhost`. The API is exposed at `http://localhost:4848`; pgAdmin is exposed on the configured `PGADMIN_PORT`.

Compose persists PostgreSQL, Redis, pgAdmin, and uploaded avatar data in named Docker volumes. The backend initializes its tables on startup.

### Run the client and API separately

- Start PostgreSQL and Redis, then configure the backend environment using `server/.env.example`. For local services, use `DB_HOST=localhost` and `REDIS_URI=localhost:6379`. From `server`, run `go run ./cmd`.
- From `client`, run `npm ci` and then `npm run dev`. The Vite development server prints the local URL to open.
- Useful client scripts: `npm run build`, `npm run lint`, and `npm run preview`.

The current browser HTTP client and avatar URL are configured for `http://localhost:4848`. For a deployed web client or a mobile client, configure an API base URL appropriate to that runtime; `localhost` on a phone refers to the phone itself, not the development computer.

## Mobile-replication considerations

Use the feature sections and API table above as the behavior checklist. The current repository is a web app; it does not implement native navigation, offline storage/sync, push notifications, biometric sign-in, or mobile-specific media handling. Those would be separate mobile-product decisions rather than existing Memoix behavior. The SMS integration is also not implemented, so a mobile build will need a real delivery provider or an explicitly designed development/test flow.
