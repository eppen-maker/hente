import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const CANDIDATES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

async function firstExisting(base) {
  for (const suffix of CANDIDATES) {
    const candidate = `${base}${suffix}`;
    try {
      await access(candidate);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

/** Resolves the "@/..." path alias from tsconfig for plain `node --test`. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = await firstExisting(path.join(SRC, specifier.slice(2)));
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
