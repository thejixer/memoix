export type MemoryType = 'memo' | 'expense';

export type Memory = {
  id: number;
  content: string;
  type: MemoryType;
  amount: number | null;
  occurredAt: string;
  tags: string[];
  people: string[];
  places: string[];
};

export type Person = {
  id: number;
  fullName: string;
  mentionKey: string;
  description: string;
  birthdate: string | null;
  phoneNumber: string;
  avatarBase64: string | null;
  avatarMimeType: string | null;
};

export type Tag = { id: number; name: string };

export type Entities = {
  tags: string[];
  people: string[];
  places: string[];
};

const unique = (values: string[]) =>
  [...new Set(values.map(value => value.toLocaleLowerCase()))];

export function mentionKey(fullName: string): string {
  return fullName
    .normalize('NFKD')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]/gu, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLocaleLowerCase();
}

export function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function extractEntities(content: string): Entities {
  return {
    tags: unique((content.match(/#[\p{L}\p{N}_]+/gu) ?? []).map(value => value.slice(1))),
    people: unique(content.match(/@[\p{L}\p{N}_]+/gu) ?? []).map(value =>
      value.slice(1),
    ),
    places: unique((content.match(/&[\p{L}\p{N}_]+/gu) ?? []).map(value => value.slice(1))),
  };
}

export function matchesEntityFilter(
  memory: Memory,
  filter: Entities,
): boolean {
  const containsEvery = (available: string[], requested: string[]) => {
    const values = new Set(available.map(value => value.toLocaleLowerCase()));
    return requested.every(value => values.has(value.toLocaleLowerCase()));
  };

  return (
    containsEvery(memory.tags, filter.tags) &&
    containsEvery(memory.people, filter.people) &&
    containsEvery(memory.places, filter.places)
  );
}

export function filterMemories(
  memories: Memory[],
  query: string,
  since: string,
  until: string,
): Memory[] {
  const entities = extractEntities(query);
  let startDate = since ? new Date(`${since}T00:00:00`) : null;
  let endDate = until ? new Date(`${until}T00:00:00`) : null;
  if (
    startDate &&
    endDate &&
    Number.isFinite(startDate.getTime()) &&
    Number.isFinite(endDate.getTime()) &&
    startDate > endDate
  ) {
    [startDate, endDate] = [endDate, startDate];
  }
  const start = startDate?.getTime() ?? -Infinity;
  const end = endDate
    ? new Date(endDate).setHours(23, 59, 59, 999)
    : Infinity;

  return memories.filter(memory => {
    const occurred = new Date(memory.occurredAt).getTime();
    return (
      occurred >= start &&
      occurred <= end &&
      matchesEntityFilter(memory, entities)
    );
  });
}

export type EntityUsage = { name: string; usageCount: number };

export function getTopEntities(
  memories: Memory[],
  dimension: 'tags' | 'people',
  excluded: string[] = [],
): EntityUsage[] {
  const excludedNames = new Set(excluded.map(value => value.toLocaleLowerCase()));
  const counts = new Map<string, number>();
  const displayNames = new Map<string, string>();

  for (const memory of memories) {
    const names = new Set(memory[dimension].map(value => value.toLocaleLowerCase()));
    for (const name of names) {
      if (excludedNames.has(name)) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
      if (!displayNames.has(name)) displayNames.set(name, name);
    }
  }

  return [...counts.entries()]
    .map(([name, usageCount]) => ({
      name: displayNames.get(name) ?? name,
      usageCount,
    }))
    .sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name))
    .slice(0, 10);
}

export type GapStats = {
  count: number;
  firstDate: string | null;
  lastDate: string | null;
  mean: number;
  median: number;
  standardDeviation: number;
  minimum: number;
  maximum: number;
};

export function calculateGapStats(memories: Memory[]): GapStats {
  const timestamps = memories
    .map(memory => new Date(memory.occurredAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const gaps = timestamps.slice(1).map((time, index) =>
    (time - timestamps[index]) / 86_400_000,
  );

  if (!timestamps.length) {
    return {
      count: 0,
      firstDate: null,
      lastDate: null,
      mean: 0,
      median: 0,
      standardDeviation: 0,
      minimum: 0,
      maximum: 0,
    };
  }

  const mean = gaps.length
    ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
    : 0;
  const orderedGaps = [...gaps].sort((a, b) => a - b);
  const middle = Math.floor(orderedGaps.length / 2);
  const median = !orderedGaps.length
    ? 0
    : orderedGaps.length % 2
      ? orderedGaps[middle]
      : (orderedGaps[middle - 1] + orderedGaps[middle]) / 2;
  const variance = gaps.length
    ? gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length
    : 0;

  return {
    count: timestamps.length,
    firstDate: new Date(timestamps[0]).toISOString(),
    lastDate: new Date(timestamps[timestamps.length - 1]).toISOString(),
    mean,
    median,
    standardDeviation: Math.sqrt(variance),
    minimum: gaps.length ? Math.min(...gaps) : 0,
    maximum: gaps.length ? Math.max(...gaps) : 0,
  };
}

export type DayTotal = { date: string; total: number };

export function getDailyExpenseTotals(
  memories: Memory[],
  since: string,
  until: string,
): DayTotal[] {
  const start = new Date(`${since}T00:00:00`);
  const end = new Date(`${until}T00:00:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return [];
  }

  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  const totals = new Map<string, number>();
  for (const memory of memories) {
    if (memory.type !== 'expense' || memory.amount == null) continue;
    const day = localDateKey(memory.occurredAt);
    totals.set(day, (totals.get(day) ?? 0) + memory.amount);
  }

  const days: DayTotal[] = [];
  const cursor = new Date(first);
  while (cursor <= last) {
    const date = localDateKey(cursor);
    days.push({ date, total: totals.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export type CompositeTotal = { label: string; total: number };

export function getTopComposites(
  expenses: Memory[],
  dimension: 'tags' | 'people',
): CompositeTotal[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.type !== 'expense' || expense.amount == null) continue;
    const labels = unique(expense[dimension]).sort();
    if (!labels.length) continue;
    const marker = dimension === 'tags' ? '#' : '@';
    const label = labels.map(value => `${marker}${value}`).join(' ');
    totals.set(label, (totals.get(label) ?? 0) + expense.amount);
  }
  return [...totals.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, 20);
}
