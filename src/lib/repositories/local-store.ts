import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local JSON store used when Supabase is not configured.
 *
 * This keeps the whole platform runnable — and testable — without a database.
 * It is deliberately simple: one file per collection, read-modify-write under
 * a per-file promise chain so concurrent requests in a single dev server do
 * not clobber each other. It is not a substitute for Postgres in production.
 */

const DATA_DIR = path.join(process.cwd(), ".data");

const queues = new Map<string, Promise<unknown>>();

function filePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

export async function readCollection<T>(collection: string): Promise<T[]> {
  try {
    const raw = await readFile(filePath(collection), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Serialised read-modify-write. `mutate` receives the current rows and returns
 * the rows to persist plus whatever the caller needs back.
 */
export async function updateCollection<T, R>(
  collection: string,
  mutate: (rows: T[]) => { rows: T[]; result: R } | Promise<{ rows: T[]; result: R }>,
): Promise<R> {
  const previous = queues.get(collection) ?? Promise.resolve();

  const next = previous.then(async () => {
    const rows = await readCollection<T>(collection);
    const { rows: updated, result } = await mutate(rows);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(
      filePath(collection),
      `${JSON.stringify(updated, null, 2)}\n`,
      "utf8",
    );
    return result;
  });

  // Keep the chain alive even if this write failed, so later writes still run.
  queues.set(
    collection,
    next.catch(() => undefined),
  );

  return next;
}
