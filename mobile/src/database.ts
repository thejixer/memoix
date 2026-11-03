import * as DocumentPicker from 'expo-document-picker';
import { Directory, File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import {
  Entities,
  Memory,
  MemoryType,
  Person,
  Tag,
  extractEntities,
} from './domain';

const DATABASE_NAME = 'memoix.db';
const DATABASE_VERSION = 1;
const BACKUP_DIRECTORY_FILE = 'memoix-backup-directory.txt';
let database: SQLite.SQLiteDatabase | null = null;

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
      CREATE INDEX IF NOT EXISTS memories_occurred_at_idx ON memories(occurred_at);
      PRAGMA user_version = ${DATABASE_VERSION};
    `);
  }
  return database;
}

export async function initializeDatabase(): Promise<void> {
  await getDatabase();
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

export async function getMemories(): Promise<Memory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: number;
    content: string;
    type: MemoryType;
    amount: number | null;
    occurred_at: string;
  }>('SELECT id, content, type, amount, occurred_at FROM memories ORDER BY occurred_at DESC, id DESC');
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
  const byId = new Map(memories.map(memory => [memory.id, memory]));
  const tagRows = await db.getAllAsync<{ memory_id: number; name: string }>(
    `SELECT mt.memory_id, t.name FROM memory_tags mt
     JOIN tags t ON t.id = mt.tag_id`,
  );
  const peopleRows = await db.getAllAsync<{ memory_id: number; mention_key: string }>(
    `SELECT mp.memory_id, p.mention_key FROM memory_people mp
     JOIN people p ON p.id = mp.person_id`,
  );
  const placeRows = await db.getAllAsync<{ memory_id: number; name: string }>(
    `SELECT mp.memory_id, p.name FROM memory_places mp
     JOIN places p ON p.id = mp.place_id`,
  );

  for (const row of tagRows) byId.get(row.memory_id)?.tags.push(row.name);
  for (const row of peopleRows) byId.get(row.memory_id)?.people.push(row.mention_key);
  for (const row of placeRows) byId.get(row.memory_id)?.places.push(row.name);
  return memories;
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

export async function getPeople(): Promise<Person[]> {
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
  }>('SELECT * FROM people ORDER BY full_name COLLATE NOCASE');
  return rows.map(row => ({
    id: row.id,
    fullName: row.full_name,
    mentionKey: row.mention_key,
    description: row.description,
    birthdate: row.birthdate,
    phoneNumber: row.phone_number,
    avatarBase64: row.avatar_base64,
    avatarMimeType: row.avatar_mime_type,
  }));
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
          'SELECT id, content FROM memories',
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

export async function getTags(): Promise<Tag[]> {
  const db = await getDatabase();
  return db.getAllAsync<Tag>('SELECT id, name FROM tags ORDER BY name COLLATE NOCASE');
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
          'SELECT id, content FROM memories',
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
      version?.user_version === DATABASE_VERSION &&
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
