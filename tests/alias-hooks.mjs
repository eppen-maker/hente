import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const CANDIDATES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

async function firstExisting(base) {
  for (const suffix of CANDIDATES) {
    const candidate = `${base}${suffix}`;
    try {
      // A bare directory path matches too, so require an actual file.
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

/**
 * Resolution hooks that let plain `node --test` load the app's TypeScript:
 * the "@/..." path alias from tsconfig, and the extensionless relative
 * imports that a bundler would normally resolve.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = await firstExisting(path.join(SRC, specifier.slice(2)));
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parent = context.parentURL;
    if (parent?.startsWith("file:") && !path.extname(specifier)) {
      const base = path.resolve(path.dirname(fileURLToPath(parent)), specifier);
      const resolved = await firstExisting(base);
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
