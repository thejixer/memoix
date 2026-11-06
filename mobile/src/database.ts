import * as DocumentPicker from 'expo-document-picker';
import { Directory, File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import {
  Entities,
  CompositeTotal,
  DayTotal,
  EntityUsage,
  GapStats,
  Memory,
  MemoryType,
  Person,
  Tag,
  extractEntities,
  localDateKey,
} from './domain';

const DATABASE_NAME = 'memoix.db';
const DATABASE_VERSION = 2;
const BACKUP_DIRECTORY_FILE = 'memoix-backup-directory.txt';
let database: SQLite.SQLiteDatabase | null = null;

export type MemoryPage = { items: Memory[]; total: number };
export type PersonListItem = { person: Person; count: number };
export type TagListItem = { tag: Tag; count: number };
export type PageResult<T> = { items: T[]; total: number };
export type EntitySuggestion = { token: string; label: string };
export type EntityMemoryOverview = {
  total: number;
  topTags: EntityUsage[];
  topPeople: EntityUsage[];
};
export type MemoryAnalytics = {
  stats: GapStats;
  activityCounts: Record<string, number>;
};
export type MemoryTopEntities = {
  tags: EntityUsage[];
  mentions: EntityUsage[];
};
export type ExpenseAnalytics = {
  days: DayTotal[];
  total: number;
  topTags: CompositeTotal[];
  topPeople: CompositeTotal[];
};

function getBackupDirectoryPreferencePath(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error('The app storage directory is unavailable.');
  }
  return `${FileSystem.documentDirectory}${BACKUP_DIRECTORY_FILE}`;
}

async function getSavedBackupDirectory(): Promise<string | null> {
  const path = getBackupDirectoryPreferencePath();
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  const directoryUri = (await FileSystem.readAsStringAsync(path)).trim();
  return directoryUri || null;
}

export async function selectBackupDirectory(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    throw new Error('Choosing a backup folder is only supported on Android.');
  }

  const permissions =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) return false;
  await FileSystem.writeAsStringAsync(
    getBackupDirectoryPreferencePath(),
    permissions.directoryUri,
  );
  return true;
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await database.execAsync(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = DELETE;
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('memo', 'expense')),
        amount REAL,
        occurred_at TEXT NOT NULL,
        CHECK ((type = 'memo' AND amount IS NULL) OR
               (type = 'expense' AND amount IS NOT NULL AND amount >= 0))
      );
      CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        mention_key TEXT NOT NULL UNIQUE COLLATE NOCASE,
        description TEXT NOT NULL DEFAULT '',
        birthdate TEXT,
        phone_number TEXT NOT NULL DEFAULT '',
        avatar_base64 TEXT,
        avatar_mime_type TEXT
      );
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
      );
      CREATE TABLE IF NOT EXISTS places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
      );
      CREATE TABLE IF NOT EXISTS memory_tags (
        memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (memory_id, tag_id)
      );
      CREATE TABLE IF NOT EXISTS memory_people (
        memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        PRIMARY KEY (memory_id, person_id)
      );
      CREATE TABLE IF NOT EXISTS memory_places (
        memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        PRIMARY KEY (memory_id, place_id)
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS memories_occurred_at_idx ON memories(occurred_at);
      CREATE INDEX IF NOT EXISTS memories_type_occurred_at_idx ON memories(type, occurred_at);
      CREATE INDEX IF NOT EXISTS memory_tags_tag_idx ON memory_tags(tag_id, memory_id);
      CREATE INDEX IF NOT EXISTS memory_people_person_idx ON memory_people(person_id, memory_id);
      CREATE INDEX IF NOT EXISTS memory_places_place_idx ON memory_places(place_id, memory_id);
      PRAGMA user_version = ${DATABASE_VERSION};
    `);
  }
  return database;
}

export async function initializeDatabase(): Promise<void> {
  await getDatabase();
}

export async function getAppSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

async function resolveEntityIds(
  db: SQLite.SQLiteDatabase,
  entities: Entities,
): Promise<{ tags: number[]; people: number[]; places: number[] }> {
  const resolved: { tags: number[]; people: number[]; places: number[] } = {
    tags: [],
    people: [],
    places: [],
  };

  for (const tag of entities.tags) {
    await db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', tag);
    const row = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM tags WHERE name = ? COLLATE NOCASE',
      tag,
    );
    if (row) resolved.tags.push(row.id);
  }

  for (const key of entities.people) {
    const fullName = key.replace(/_/g, ' ');
    await db.runAsync(
      'INSERT OR IGNORE INTO people (full_name, mention_key) VALUES (?, ?)',
      fullName,
      key,
    );
    const row = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM people WHERE mention_key = ? COLLATE NOCASE',
      key,
    );
    if (row) resolved.people.push(row.id);
  }

  for (const place of entities.places) {
    await db.runAsync('INSERT OR IGNORE INTO places (name) VALUES (?)', place);
    const row = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM places WHERE name = ? COLLATE NOCASE',
      place,
    );
    if (row) resolved.places.push(row.id);
  }
  return resolved;
}

async function linkEntities(
  db: SQLite.SQLiteDatabase,
  memoryId: number,
  entities: Entities,
): Promise<void> {
  const ids = await resolveEntityIds(db, entities);
  for (const tagId of ids.tags) {
    await db.runAsync(
      'INSERT OR IGNORE INTO memory_tags (memory_id, tag_id) VALUES (?, ?)',
      memoryId,
      tagId,
    );
  }
  for (const personId of ids.people) {
    await db.runAsync(
      'INSERT OR IGNORE INTO memory_people (memory_id, person_id) VALUES (?, ?)',
      memoryId,
      personId,
    );
  }
  for (const placeId of ids.places) {
    await db.runAsync(
      'INSERT OR IGNORE INTO memory_places (memory_id, place_id) VALUES (?, ?)',
      memoryId,
      placeId,
    );
  }
}

function containsPattern(value: string): string {
  return `%${value.toLocaleLowerCase().replace(/[\\%_]/g, character => `\\${character}`)}%`;
}

export async function getPeopleListPage(
  query: string,
  limit: number,
  offset: number,
): Promise<PageResult<PersonListItem>> {
  const db = await getDatabase();
  const search = containsPattern(query);
  const predicate = `lower(p.full_name || ' ' || p.mention_key) LIKE ? ESCAPE '\\'`;
  const [count, rows] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM people p WHERE ${predicate}`,
      search,
    ),
    db.getAllAsync<{
      id: number;
      full_name: string;
      mention_key: string;
      description: string;
      birthdate: string | null;
      phone_number: string;
      avatar_base64: string | null;
      avatar_mime_type: string | null;
      memory_count: number;
    }>(
      `SELECT p.id, p.full_name, p.mention_key, p.description, p.birthdate,
        p.phone_number, p.avatar_base64, p.avatar_mime_type,
        COUNT(DISTINCT mp.memory_id) AS memory_count
       FROM people p LEFT JOIN memory_people mp ON mp.person_id = p.id
       WHERE ${predicate}
       GROUP BY p.id
       ORDER BY memory_count DESC, p.full_name COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
      search,
      Math.max(1, Math.floor(limit)),
      Math.max(0, Math.floor(offset)),
    ),
  ]);
  return {
    items: rows.map(row => ({
      person: {
        id: row.id,
        fullName: row.full_name,
        mentionKey: row.mention_key,
        description: row.description,
        birthdate: row.birthdate,
        phoneNumber: row.phone_number,
        avatarBase64: row.avatar_base64,
        avatarMimeType: row.avatar_mime_type,
      },
      count: row.memory_count,
    })),
    total: count?.total ?? 0,
  };
}

export async function getTagsListPage(
  query: string,
  limit: number,
  offset: number,
): Promise<PageResult<TagListItem>> {
  const db = await getDatabase();
  const search = containsPattern(query);
  const predicate = `lower(t.name) LIKE ? ESCAPE '\\'`;
  const [count, rows] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM tags t WHERE ${predicate}`,
      search,
    ),
    db.getAllAsync<{ id: number; name: string; memory_count: number }>(
      `SELECT t.id, t.name, COUNT(DISTINCT mt.memory_id) AS memory_count
       FROM tags t LEFT JOIN memory_tags mt ON mt.tag_id = t.id
       WHERE ${predicate}
       GROUP BY t.id
       ORDER BY memory_count DESC, t.name COLLATE NOCASE ASC
       LIMIT ? OFFSET ?`,
      search,
      Math.max(1, Math.floor(limit)),
      Math.max(0, Math.floor(offset)),
    ),
  ]);
  return {
    items: rows.map(row => ({
      tag: { id: row.id, name: row.name },
      count: row.memory_count,
    })),
    total: count?.total ?? 0,
  };
}

function dateBound(value: string, endOfDay = false): string | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function buildMemoryFilter(query: string, since: string, until: string) {
  const entities = extractEntities(query);
  const clauses = ['1 = 1'];
  const parameters: (string | number)[] = [];
  let start = dateBound(since);
  let end = dateBound(until, true);
  if (since && until && start && end && start > end) {
    [start, end] = [dateBound(until), dateBound(since, true)];
  }
  if (start) {
    clauses.push('m.occurred_at >= ?');
    parameters.push(start);
  }
  if (end) {
    clauses.push('m.occurred_at <= ?');
    parameters.push(end);
  }
  const addEntityFilters = (
    names: string[],
    table: 'memory_tags' | 'memory_people' | 'memory_places',
    entityTable: 'tags' | 'people' | 'places',
    entityColumn: 'name' | 'mention_key',
  ) => {
    for (const name of names) {
      clauses.push(
        `EXISTS (
          SELECT 1 FROM ${table} relation
          JOIN ${entityTable} entity ON entity.id = relation.${entityTable === 'people' ? 'person_id' : entityTable === 'tags' ? 'tag_id' : 'place_id'}
          WHERE relation.memory_id = m.id AND entity.${entityColumn} = ? COLLATE NOCASE
        )`,
      );
      parameters.push(name);
    }
  };
  addEntityFilters(entities.tags, 'memory_tags', 'tags', 'name');
  addEntityFilters(entities.people, 'memory_people', 'people', 'mention_key');
  addEntityFilters(entities.places, 'memory_places', 'places', 'name');
  return { where: clauses.join(' AND '), parameters, entities };
}

async function getMemoriesByIds(
  db: SQLite.SQLiteDatabase,
  rows: {
    id: number;
    content: string;
    type: MemoryType;
    amount: number | null;
    occurred_at: string;
  }[],
): Promise<Memory[]> {
  const memories: Memory[] = rows.map(row => ({
    id: row.id,
    content: row.content,
    type: row.type,
    amount: row.amount,
    occurredAt: row.occurred_at,
    tags: [],
    people: [],
    places: [],
  }));
  if (!memories.length) return memories;

  const byId = new Map(memories.map(memory => [memory.id, memory]));
  const placeholders = memories.map(() => '?').join(', ');
  const ids = memories.map(memory => memory.id);
  const [tagRows, peopleRows, placeRows] = await Promise.all([
    db.getAllAsync<{ memory_id: number; name: string }>(
      `SELECT mt.memory_id, t.name FROM memory_tags mt
       JOIN tags t ON t.id = mt.tag_id WHERE mt.memory_id IN (${placeholders})`,
      ...ids,
    ),
    db.getAllAsync<{ memory_id: number; mention_key: string }>(
      `SELECT mp.memory_id, p.mention_key FROM memory_people mp
       JOIN people p ON p.id = mp.person_id WHERE mp.memory_id IN (${placeholders})`,
      ...ids,
    ),
    db.getAllAsync<{ memory_id: number; name: string }>(
      `SELECT mp.memory_id, p.name FROM memory_places mp
       JOIN places p ON p.id = mp.place_id WHERE mp.memory_id IN (${placeholders})`,
      ...ids,
    ),
  ]);
  for (const row of tagRows) byId.get(row.memory_id)?.tags.push(row.name);
  for (const row of peopleRows) byId.get(row.memory_id)?.people.push(row.mention_key);
  for (const row of placeRows) byId.get(row.memory_id)?.places.push(row.name);
  return memories;
}

export async function getMemoryPage(
  query: string,
  since: string,
  until: string,
  limit: number,
  offset: number,
): Promise<MemoryPage> {
  const db = await getDatabase();
  const filter = buildMemoryFilter(query, since, until);
  const [count, rows] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM memories m WHERE ${filter.where}`,
      ...filter.parameters,
    ),
    db.getAllAsync<{
      id: number;
      content: string;
      type: MemoryType;
      amount: number | null;
      occurred_at: string;
    }>(
      `SELECT m.id, m.content, m.type, m.amount, m.occurred_at
       FROM memories m WHERE ${filter.where}
       ORDER BY m.occurred_at DESC, m.id DESC LIMIT ? OFFSET ?`,
      ...filter.parameters,
      Math.max(1, Math.floor(limit)),
      Math.max(0, Math.floor(offset)),
    ),
  ]);
  return {
    items: await getMemoriesByIds(db, rows),
    total: count?.total ?? 0,
  };
}

export async function getMemoryById(id: number): Promise<Memory | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: number;
    content: string;
    type: MemoryType;
    amount: number | null;
    occurred_at: string;
  }>(
    'SELECT id, content, type, amount, occurred_at FROM memories WHERE id = ?',
    id,
  );
  if (!row) return null;
  const [memory] = await getMemoriesByIds(db, [row]);
  return memory;
}

export async function getMemoryAnalytics(
  query: string,
  since: string,
  until: string,
  year: number,
): Promise<MemoryAnalytics> {
  const db = await getDatabase();
  const filter = buildMemoryFilter(query, since, until);
  const filteredCte = `WITH filtered AS (
    SELECT m.id, m.occurred_at FROM memories m WHERE ${filter.where}
  )`;
  const statsPromise = db.getFirstAsync<{
    count: number;
    first_date: string | null;
    last_date: string | null;
    mean: number | null;
    median: number | null;
    mean_square: number | null;
    minimum: number | null;
    maximum: number | null;
  }>(
    `${filteredCte},
    valid_dates AS (
      SELECT id, occurred_at, julianday(occurred_at) AS julian_day
      FROM filtered WHERE julianday(occurred_at) IS NOT NULL
    ),
    ordered_dates AS (
      SELECT id, occurred_at, julian_day,
        LAG(julian_day) OVER (ORDER BY julian_day, id) AS previous_day
      FROM valid_dates
    ),
    gaps AS (
      SELECT (julian_day - previous_day) AS gap
      FROM ordered_dates WHERE previous_day IS NOT NULL
    ),
    ranked_gaps AS (
      SELECT gap, ROW_NUMBER() OVER (ORDER BY gap) AS row_number,
        COUNT(*) OVER () AS gap_count FROM gaps
    )
    SELECT
      (SELECT COUNT(*) FROM valid_dates) AS count,
      (SELECT occurred_at FROM valid_dates ORDER BY julian_day, id LIMIT 1) AS first_date,
      (SELECT occurred_at FROM valid_dates ORDER BY julian_day DESC, id DESC LIMIT 1) AS last_date,
      (SELECT AVG(gap) FROM gaps) AS mean,
      (SELECT AVG(CASE WHEN row_number IN ((gap_count + 1) / 2, (gap_count + 2) / 2)
        THEN gap END) FROM ranked_gaps) AS median,
      (SELECT AVG(gap * gap) FROM gaps) AS mean_square,
      (SELECT MIN(gap) FROM gaps) AS minimum,
      (SELECT MAX(gap) FROM gaps) AS maximum`,
    ...filter.parameters,
  );
  const firstYearDay = `${year}-01-01`;
  const lastYearDay = `${year}-12-31`;
  const activityPromise = db.getAllAsync<{ date: string; count: number }>(
    `${filteredCte}
     SELECT date(filtered.occurred_at, 'localtime') AS date, COUNT(*) AS count
     FROM filtered
     WHERE date(filtered.occurred_at, 'localtime') BETWEEN ? AND ?
     GROUP BY date(filtered.occurred_at, 'localtime')`,
    ...filter.parameters,
    firstYearDay,
    lastYearDay,
  );
  const [statsRow, activityRows] = await Promise.all([
    statsPromise,
    activityPromise,
  ]);
  const mean = statsRow?.mean ?? 0;
  return {
    stats: {
      count: statsRow?.count ?? 0,
      firstDate: statsRow?.first_date ?? null,
      lastDate: statsRow?.last_date ?? null,
      mean,
      median: statsRow?.median ?? 0,
      standardDeviation: Math.sqrt(
        Math.max(0, (statsRow?.mean_square ?? 0) - mean * mean),
      ),
      minimum: statsRow?.minimum ?? 0,
      maximum: statsRow?.maximum ?? 0,
    },
    activityCounts: Object.fromEntries(
      activityRows.map(row => [row.date, row.count]),
    ),
  };
}

export async function getMemoryTopEntities(
  query: string,
  since: string,
  until: string,
): Promise<MemoryTopEntities> {
  const db = await getDatabase();
  const filter = buildMemoryFilter(query, since, until);
  const filteredCte = `WITH filtered AS (
    SELECT m.id FROM memories m WHERE ${filter.where}
  )`;
  const getTop = (
    dimension: 'tags' | 'people',
    excluded: string[],
  ): Promise<EntityUsage[]> => {
    const table = dimension === 'tags' ? 'memory_tags' : 'memory_people';
    const entityTable = dimension === 'tags' ? 'tags' : 'people';
    const relationKey = dimension === 'tags' ? 'tag_id' : 'person_id';
    const nameColumn = dimension === 'tags' ? 'name' : 'mention_key';
    const exclusions = excluded.length
      ? `AND lower(entity.${nameColumn}) NOT IN (${excluded.map(() => '?').join(', ')})`
      : '';
    return db.getAllAsync<{ name: string; usage_count: number }>(
      `${filteredCte}
       SELECT entity.${nameColumn} AS name,
         COUNT(DISTINCT relation.memory_id) AS usage_count
       FROM filtered
       JOIN ${table} relation ON relation.memory_id = filtered.id
       JOIN ${entityTable} entity ON entity.id = relation.${relationKey}
       WHERE 1 = 1 ${exclusions}
       GROUP BY entity.id
       ORDER BY usage_count DESC, name COLLATE NOCASE ASC LIMIT 10`,
      ...filter.parameters,
      ...excluded.map(value => value.toLocaleLowerCase()),
    ).then(rows =>
      rows.map(row => ({ name: row.name.toLocaleLowerCase(), usageCount: row.usage_count })),
    );
  };
  const [tags, mentions] = await Promise.all([
    getTop('tags', filter.entities.tags),
    getTop('people', filter.entities.people),
  ]);
  return { tags, mentions };
}

export async function getEntitySuggestions(
  marker: '#' | '@' | '&',
  query: string,
): Promise<EntitySuggestion[]> {
  const db = await getDatabase();
  const normalizedQuery = query.toLocaleLowerCase();
  const search = `%${normalizedQuery.replace(/[\\%_]/g, '\\$&')}%`;
  const rows = marker === '@'
    ? await db.getAllAsync<{
        name: string;
        label: string;
      }>(
        `SELECT p.mention_key AS name,
          CASE WHEN trim(p.full_name) = '' THEN '@' || p.mention_key
               ELSE '@' || p.mention_key || ' · ' || p.full_name END AS label
         FROM people p
         WHERE lower(p.mention_key) LIKE ? ESCAPE '\\'
         ORDER BY (
           SELECT MAX(m.occurred_at) FROM memory_people mp
           JOIN memories m ON m.id = mp.memory_id WHERE mp.person_id = p.id
         ) DESC, p.mention_key COLLATE NOCASE ASC LIMIT 5`,
        search,
      )
    : marker === '#'
      ? await db.getAllAsync<{ name: string; label: string }>(
          `SELECT t.name, '#' || t.name AS label
           FROM tags t
           WHERE lower(t.name) LIKE ? ESCAPE '\\'
           ORDER BY (
             SELECT MAX(m.occurred_at) FROM memory_tags mt
             JOIN memories m ON m.id = mt.memory_id WHERE mt.tag_id = t.id
           ) DESC, t.name COLLATE NOCASE ASC LIMIT 5`,
          search,
        )
      : await db.getAllAsync<{ name: string; label: string }>(
          `SELECT p.name, '&' || p.name AS label
           FROM places p
           WHERE lower(p.name) LIKE ? ESCAPE '\\'
           ORDER BY (
             SELECT MAX(m.occurred_at) FROM memory_places mp
             JOIN memories m ON m.id = mp.memory_id WHERE mp.place_id = p.id
           ) DESC, p.name COLLATE NOCASE ASC LIMIT 5`,
          search,
        );
  return rows.map(row => ({ token: `${marker}${row.name}`, label: row.label }));
}

export async function getPersonById(id: number): Promise<Person | null> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    full_name: string;
    mention_key: string;
    description: string;
    birthdate: string | null;
    phone_number: string;
    avatar_base64: string | null;
    avatar_mime_type: string | null;
  }>('SELECT * FROM people WHERE id = ?', id);
  const row = rows[0];
  return row ? {
    id: row.id,
    fullName: row.full_name,
    mentionKey: row.mention_key,
    description: row.description,
    birthdate: row.birthdate,
    phoneNumber: row.phone_number,
    avatarBase64: row.avatar_base64,
    avatarMimeType: row.avatar_mime_type,
  } : null;
}

export async function getTagById(id: number): Promise<Tag | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Tag>('SELECT id, name FROM tags WHERE id = ?', id);
}

export async function getEntityMemoryPage(
  kind: 'person' | 'tag',
  entityId: number,
  limit: number,
  offset: number,
): Promise<MemoryPage> {
  const db = await getDatabase();
  const table = kind === 'person' ? 'memory_people' : 'memory_tags';
  const relationId = kind === 'person' ? 'person_id' : 'tag_id';
  const [count, rows] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM ${table} WHERE ${relationId} = ?`,
      entityId,
    ),
    db.getAllAsync<{
      id: number;
      content: string;
      type: MemoryType;
      amount: number | null;
      occurred_at: string;
    }>(
      `SELECT m.id, m.content, m.type, m.amount, m.occurred_at
       FROM memories m JOIN ${table} relation ON relation.memory_id = m.id
       WHERE relation.${relationId} = ?
       ORDER BY m.occurred_at DESC, m.id DESC LIMIT ? OFFSET ?`,
      entityId,
      Math.max(1, Math.floor(limit)),
      Math.max(0, Math.floor(offset)),
    ),
  ]);
  return {
    items: await getMemoriesByIds(db, rows),
    total: count?.total ?? 0,
  };
}

export async function getEntityMemoryOverview(
  kind: 'person' | 'tag',
  entityId: number,
): Promise<EntityMemoryOverview> {
  const db = await getDatabase();
  const table = kind === 'person' ? 'memory_people' : 'memory_tags';
  const relationId = kind === 'person' ? 'person_id' : 'tag_id';
  const rows = await db.getAllAsync<{
    type: 'tags' | 'people';
    name: string;
    usage_count: number;
  }>(
    `WITH linked AS (
       SELECT memory_id FROM ${table} WHERE ${relationId} = ?
     )
     SELECT 'tags' AS type, t.name AS name, COUNT(DISTINCT mt.memory_id) AS usage_count
       FROM linked l JOIN memory_tags mt ON mt.memory_id = l.memory_id
       JOIN tags t ON t.id = mt.tag_id GROUP BY t.id
     UNION ALL
     SELECT 'people' AS type, p.mention_key AS name, COUNT(DISTINCT mp.memory_id) AS usage_count
       FROM linked l JOIN memory_people mp ON mp.memory_id = l.memory_id
       JOIN people p ON p.id = mp.person_id GROUP BY p.id`,
    entityId,
  );
  const count = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${table} WHERE ${relationId} = ?`,
    entityId,
  );
  const toUsages = (type: 'tags' | 'people') =>
    rows
      .filter(row => row.type === type)
      .map(row => ({ name: row.name.toLocaleLowerCase(), usageCount: row.usage_count }))
      .sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name));
  const entityName = kind === 'person'
    ? await db.getFirstAsync<{ name: string }>(
        'SELECT mention_key AS name FROM people WHERE id = ?',
        entityId,
      )
    : await db.getFirstAsync<{ name: string }>(
        'SELECT name FROM tags WHERE id = ?',
        entityId,
      );
  return {
    total: count?.total ?? 0,
    topTags: toUsages('tags')
      .filter(item => kind !== 'tag' || item.name !== entityName?.name.toLocaleLowerCase())
      .slice(0, 10),
    topPeople: toUsages('people')
      .filter(item => kind !== 'person' || item.name !== entityName?.name.toLocaleLowerCase())
      .slice(0, 10),
  };
}

export async function getBirthdayPeople(): Promise<
  Pick<Person, 'id' | 'fullName' | 'mentionKey' | 'birthdate'>[]
> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    full_name: string;
    mention_key: string;
    birthdate: string;
  }>(
    `SELECT id, full_name, mention_key, birthdate FROM people
     WHERE birthdate IS NOT NULL ORDER BY substr(birthdate, 6), full_name COLLATE NOCASE`,
  );
  return rows.map(row => ({
    id: row.id,
    fullName: row.full_name,
    mentionKey: row.mention_key,
    birthdate: row.birthdate,
  }));
}

function buildExpenseDateFilter(since: string, until: string) {
  const clauses = ['m.type = ?'];
  const parameters: (string | number)[] = ['expense'];
  let first = since || null;
  let last = until || null;
  if (first && last && first > last) [first, last] = [last, first];
  if (first) {
    const start = dateBound(first);
    if (start) {
      clauses.push('m.occurred_at >= ?');
      parameters.push(start);
    }
  }
  if (last) {
    const end = dateBound(last, true);
    if (end) {
      clauses.push('m.occurred_at <= ?');
      parameters.push(end);
    }
  }
  return { where: clauses.join(' AND '), parameters };
}

function dateRange(first: string, last: string): string[] {
  const start = new Date(`${first}T12:00:00`);
  const end = new Date(`${last}T12:00:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return [];
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const days: string[] = [];
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    days.push(localDateKey(cursor));
  }
  return days;
}

export async function getExpenseAnalytics(
  since: string,
  until: string,
  fallbackSince: string,
  fallbackUntil: string,
): Promise<ExpenseAnalytics> {
  const db = await getDatabase();
  const filter = buildExpenseDateFilter(since, until);
  const [range, totalRow] = await Promise.all([
    since && until
      ? Promise.resolve(null)
      : db.getFirstAsync<{ first_date: string | null; last_date: string | null }>(
      `SELECT MIN(date(occurred_at, 'localtime')) AS first_date,
        MAX(date(occurred_at, 'localtime')) AS last_date
       FROM memories WHERE type = 'expense'`,
        ),
    db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(m.amount) AS total FROM memories m WHERE ${filter.where}`,
      ...filter.parameters,
    ),
  ]);
  const chartSince = since || range?.first_date || fallbackSince;
  const chartUntil = until || range?.last_date || fallbackUntil;
  const chartRange = dateRange(chartSince, chartUntil);
  const [dailyRows, topTags, topPeople] = await Promise.all([
    db.getAllAsync<{ date: string; total: number }>(
      `SELECT date(m.occurred_at, 'localtime') AS date, SUM(m.amount) AS total
       FROM memories m
       WHERE ${filter.where}
         AND date(m.occurred_at, 'localtime') BETWEEN ? AND ?
       GROUP BY date(m.occurred_at, 'localtime')`,
      ...filter.parameters,
      chartRange[0] ?? chartSince,
      chartRange[chartRange.length - 1] ?? chartUntil,
    ),
    getExpenseCombinations(db, 'tags', filter.where, filter.parameters),
    getExpenseCombinations(db, 'people', filter.where, filter.parameters),
  ]);
  const totalsByDate = new Map(dailyRows.map(row => [row.date, row.total]));
  return {
    days: chartRange.map(date => ({ date, total: totalsByDate.get(date) ?? 0 })),
    total: totalRow?.total ?? 0,
    topTags,
    topPeople,
  };
}

function getExpenseCombinations(
  db: SQLite.SQLiteDatabase,
  dimension: 'tags' | 'people',
  where: string,
  parameters: (string | number)[],
): Promise<CompositeTotal[]> {
  const relationTable = dimension === 'tags' ? 'memory_tags' : 'memory_people';
  const entityTable = dimension === 'tags' ? 'tags' : 'people';
  const relationColumn = dimension === 'tags' ? 'tag_id' : 'person_id';
  const entityColumn = dimension === 'tags' ? 'name' : 'mention_key';
  const marker = dimension === 'tags' ? '#' : '@';
  return db.getAllAsync<{ label: string; total: number }>(
    `SELECT label, SUM(amount) AS total FROM (
       SELECT m.id, m.amount, (
         SELECT group_concat(label, ' ') FROM (
           SELECT '${marker}' || entity.${entityColumn} AS label
           FROM ${relationTable} relation
           JOIN ${entityTable} entity ON entity.id = relation.${relationColumn}
           WHERE relation.memory_id = m.id
           ORDER BY entity.${entityColumn} COLLATE NOCASE
         )
       ) AS label
       FROM memories m WHERE ${where}
     )
     WHERE label IS NOT NULL AND label <> ''
     GROUP BY label ORDER BY total DESC, label COLLATE NOCASE ASC LIMIT 20`,
    ...parameters,
  );
}

export async function getExpensesOnDate(
  date: string,
  limit: number,
  offset: number,
): Promise<MemoryPage> {
  const db = await getDatabase();
  const [count, rows] = await Promise.all([
    db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM memories m
       WHERE m.type = 'expense' AND m.occurred_at >= ? AND m.occurred_at <= ?`,
      dateBound(date),
      dateBound(date, true),
    ),
    db.getAllAsync<{
      id: number;
      content: string;
      type: MemoryType;
      amount: number | null;
      occurred_at: string;
    }>(
      `SELECT m.id, m.content, m.type, m.amount, m.occurred_at FROM memories m
       WHERE m.type = 'expense' AND m.occurred_at >= ? AND m.occurred_at <= ?
       ORDER BY m.occurred_at DESC, m.id DESC LIMIT ? OFFSET ?`,
      dateBound(date),
      dateBound(date, true),
      Math.max(1, Math.floor(limit)),
      Math.max(0, Math.floor(offset)),
    ),
  ]);
  return {
    items: await getMemoriesByIds(db, rows),
    total: count?.total ?? 0,
  };
}

export async function saveMemory(input: {
  id?: number;
  content: string;
  type: MemoryType;
  amount: number | null;
  occurredAt: string;
}): Promise<void> {
  if (input.type === 'memo' && input.amount !== null) {
    throw new Error('Memo entries cannot have an amount.');
  }
  if (
    input.type === 'expense' &&
    (input.amount === null || !Number.isFinite(input.amount) || input.amount < 0)
  ) {
    throw new Error('Enter a valid non-negative expense amount.');
  }

  const db = await getDatabase();
  const entities = extractEntities(input.content);
  await db.withTransactionAsync(async () => {
    let memoryId = input.id;
    if (memoryId) {
      await db.runAsync(
        'UPDATE memories SET content = ?, type = ?, amount = ?, occurred_at = ? WHERE id = ?',
        input.content,
        input.type,
        input.amount,
        input.occurredAt,
        memoryId,
      );
      await db.runAsync('DELETE FROM memory_tags WHERE memory_id = ?', memoryId);
      await db.runAsync('DELETE FROM memory_people WHERE memory_id = ?', memoryId);
      await db.runAsync('DELETE FROM memory_places WHERE memory_id = ?', memoryId);
    } else {
      const result = await db.runAsync(
        'INSERT INTO memories (content, type, amount, occurred_at) VALUES (?, ?, ?, ?)',
        input.content,
        input.type,
        input.amount,
        input.occurredAt,
      );
      memoryId = result.lastInsertRowId;
    }
    await linkEntities(db, memoryId, entities);
  });
}

export async function deleteMemory(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM memories WHERE id = ?', id);
}

export async function savePerson(
  input: Omit<Person, 'id'> & { id?: number },
): Promise<void> {
  const db = await getDatabase();
  const key = input.mentionKey.trim().replace(/^@/, '').toLocaleLowerCase();
  if (!/^[\p{L}\p{N}_]+$/u.test(key)) {
    throw new Error('Enter a handle using letters, numbers, and underscores.');
  }

  await db.withTransactionAsync(async () => {
    if (input.id) {
      const previous = await db.getFirstAsync<{ mention_key: string }>(
        'SELECT mention_key FROM people WHERE id = ?',
        input.id,
      );
      if (!previous) throw new Error('Person no longer exists.');
      await db.runAsync(
        `UPDATE people SET full_name = ?, mention_key = ?, description = ?,
         birthdate = ?, phone_number = ?, avatar_base64 = ?, avatar_mime_type = ?
         WHERE id = ?`,
        input.fullName.trim(),
        key,
        input.description,
        input.birthdate,
        input.phoneNumber,
        input.avatarBase64,
        input.avatarMimeType,
        input.id,
      );
      if (previous.mention_key !== key) {
        const memories = await db.getAllAsync<{ id: number; content: string }>(
          `SELECT m.id, m.content FROM memories m
           JOIN memory_people mp ON mp.memory_id = m.id
           WHERE mp.person_id = ?`,
          input.id,
        );
        const expression = new RegExp(
          `@${escapeRegExp(previous.mention_key)}(?![\\p{L}\\p{N}_])`,
          'giu',
        );
        for (const memory of memories) {
          const content = memory.content.replace(expression, `@${key}`);
          if (content !== memory.content) {
            await db.runAsync('UPDATE memories SET content = ? WHERE id = ?', content, memory.id);
          }
        }
      }
    } else {
      await db.runAsync(
        `INSERT INTO people
         (full_name, mention_key, description, birthdate, phone_number, avatar_base64, avatar_mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        input.fullName.trim(),
        key,
        input.description,
        input.birthdate,
        input.phoneNumber,
        input.avatarBase64,
        input.avatarMimeType,
      );
    }
  });
}

export async function deletePerson(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM people WHERE id = ?', id);
}

export async function saveTag(input: { id?: number; name: string }): Promise<void> {
  const db = await getDatabase();
  const name = input.name.trim().replace(/^#/, '').toLocaleLowerCase();
  if (!/^[\p{L}\p{N}_]+$/u.test(name)) {
    throw new Error('A tag must be one word. Use letters, numbers, and underscores.');
  }
  await db.withTransactionAsync(async () => {
    if (input.id) {
      const previous = await db.getFirstAsync<{ name: string }>(
        'SELECT name FROM tags WHERE id = ?',
        input.id,
      );
      if (!previous) throw new Error('Tag no longer exists.');
      await db.runAsync('UPDATE tags SET name = ? WHERE id = ?', name, input.id);
      if (previous.name !== name) {
        const memories = await db.getAllAsync<{ id: number; content: string }>(
          `SELECT m.id, m.content FROM memories m
           JOIN memory_tags mt ON mt.memory_id = m.id
           WHERE mt.tag_id = ?`,
          input.id,
        );
        const expression = new RegExp(
          `#${escapeRegExp(previous.name)}(?![\\p{L}\\p{N}_])`,
          'giu',
        );
        for (const memory of memories) {
          const content = memory.content.replace(expression, `#${name}`);
          if (content !== memory.content) {
            await db.runAsync('UPDATE memories SET content = ? WHERE id = ?', content, memory.id);
          }
        }
      }
    } else {
      await db.runAsync('INSERT INTO tags (name) VALUES (?)', name);
    }
  });
}

export async function deleteTag(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tags WHERE id = ?', id);
}

export async function exportBackup(): Promise<void> {
  let directoryUri: string | null = null;
  if (Platform.OS === 'android') {
    directoryUri = await getSavedBackupDirectory();
    if (directoryUri) {
      try {
        await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);
      } catch {
        directoryUri = null;
      }
    }
    if (!directoryUri && !(await selectBackupDirectory())) return;
    directoryUri = await getSavedBackupDirectory();
    if (!directoryUri) throw new Error('The backup folder was not saved.');
  }

  const source = await getDatabase();
  const backupName = `memoix-backup-${Date.now()}.db`;
  const backup = await SQLite.openDatabaseAsync(backupName);
  let closed = false;
  try {
    await SQLite.backupDatabaseAsync({
      sourceDatabase: source,
      destDatabase: backup,
    });
    await backup.closeAsync();
    closed = true;
    if (directoryUri) {
      await new File(`file://${backup.databasePath}`).copy(
        new Directory(directoryUri),
        { overwrite: true },
      );
    } else {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
      }
      await Sharing.shareAsync(`file://${backup.databasePath}`, {
        mimeType: 'application/vnd.sqlite3',
        dialogTitle: 'Export Memoix backup',
      });
    }
  } finally {
    if (!closed) await backup.closeAsync();
    await SQLite.deleteDatabaseAsync(backupName);
  }
}

export async function restoreBackup(): Promise<boolean> {
  const selection = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (selection.canceled || !selection.assets[0]) return false;

  const stagedName = `memoix-restore-${Date.now()}.db`;
  const liveDb = await getDatabase();
  const cacheDirectoryUri = FileSystem.cacheDirectory;
  if (!cacheDirectoryUri) throw new Error('The app cache directory is unavailable.');
  const cacheDirectory = cacheDirectoryUri
    .replace(/^file:\/\//, '')
    .replace(/\/+$/, '');
  const stagedPath = `${cacheDirectoryUri}${stagedName}`;
  const rollbackName = `memoix-rollback-${Date.now()}.db`;
  let staged: SQLite.SQLiteDatabase | null = null;
  let rollback: SQLite.SQLiteDatabase | null = null;
  try {
    await FileSystem.copyAsync({ from: selection.assets[0].uri, to: stagedPath });
    staged = await SQLite.openDatabaseAsync(stagedName, {}, cacheDirectory);
    const integrity = await staged.getFirstAsync<{ integrity_check: string }>(
      'PRAGMA integrity_check',
    );
    const version = await staged.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version',
    );
    const requiredTables = await staged.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table'`,
    );
    const names = new Set(requiredTables.map(table => table.name));
    const isMemoixBackup =
      integrity?.integrity_check === 'ok' &&
      version?.user_version !== undefined &&
      version.user_version >= 1 &&
      version.user_version <= DATABASE_VERSION &&
      [
        'memories',
        'people',
        'tags',
        'places',
        'memory_tags',
        'memory_people',
        'memory_places',
      ].every(name => names.has(name));
    if (!isMemoixBackup) {
      throw new Error('This file is not a valid Memoix backup.');
    }

    rollback = await SQLite.openDatabaseAsync(rollbackName, {}, cacheDirectory);
    await SQLite.backupDatabaseAsync({ sourceDatabase: liveDb, destDatabase: rollback });
    try {
      await SQLite.backupDatabaseAsync({ sourceDatabase: staged, destDatabase: liveDb });
      await liveDb.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        PRAGMA user_version = ${DATABASE_VERSION};
      `);
    } catch (error) {
      try {
        await SQLite.backupDatabaseAsync({ sourceDatabase: rollback, destDatabase: liveDb });
      } catch (rollbackError) {
        const restoreMessage = error instanceof Error ? error.message : String(error);
        const rollbackMessage =
          rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
        throw new Error(
          `Restore failed (${restoreMessage}), and the previous data could not be recovered (${rollbackMessage}).`,
        );
      }
      throw error;
    }
    return true;
  } finally {
    if (staged) await staged.closeAsync();
    if (rollback) await rollback.closeAsync();
    if ((await FileSystem.getInfoAsync(stagedPath)).exists) {
      await SQLite.deleteDatabaseAsync(stagedName, cacheDirectory);
    }
    const rollbackPath = `${cacheDirectoryUri}${rollbackName}`;
    if ((await FileSystem.getInfoAsync(rollbackPath)).exists) {
      await SQLite.deleteDatabaseAsync(rollbackName, cacheDirectory);
    }
  }
}

export async function confirmRestore(): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Restore backup?',
      'Restoring replaces all memories, people, and tags currently on this device.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Choose backup', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
