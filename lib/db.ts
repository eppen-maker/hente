import fs from "node:fs";
import path from "node:path";
import type { Store } from "./types";
import { buildSeed } from "./seed";

/**
 * Persistence layer. The rest of the application only talks to this module,
 * so the JSON document store can be swapped for Postgres/Supabase later
 * without touching pages or components.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "store.json");

let cache: Store | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readStore(): Store {
  if (cache) return cache;
  ensureDir();
  if (!fs.existsSync(FILE)) {
    const seeded = buildSeed();
    fs.writeFileSync(FILE, JSON.stringify(seeded, null, 2));
    cache = seeded;
    return seeded;
  }
  const raw = fs.readFileSync(FILE, "utf8");
  try {
    cache = JSON.parse(raw) as Store;
  } catch {
    const seeded = buildSeed();
    fs.writeFileSync(FILE, JSON.stringify(seeded, null, 2));
    cache = seeded;
  }
  return cache!;
}

export function writeStore(store: Store): Store {
  ensureDir();
  cache = store;
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
  return store;
}

/** Read–modify–write helper used by every mutation endpoint. */
export function mutate<T>(fn: (store: Store) => T): T {
  const store = structuredClone(readStore());
  const result = fn(store);
  writeStore(store);
  return result;
}

export function resetStore(): Store {
  return writeStore(buildSeed());
}

export const uid = (prefix: string): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
