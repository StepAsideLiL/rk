import type { Extension } from "./types";

const BUNDLE_KEYS: ReadonlySet<string> = new Set(["name", "extensions", "options"]);

export function flattenExtensions(
  extensions: readonly Extension<unknown>[],
  ancestors: readonly Extension<unknown>[] = [],
): readonly Extension<unknown>[] {
  const flattened: Extension<unknown>[] = [];

  for (const extension of extensions) {
    if (!extension.extensions?.length) {
      flattened.push(extension);
      continue;
    }

    if (ancestors.includes(extension)) {
      throw new Error(`Circular extension bundle detected at "${extension.name}".`);
    }

    assertBundle(extension);
    flattened.push(...flattenExtensions(extension.extensions, [...ancestors, extension]));
  }

  return flattened;
}

function assertBundle(extension: Extension<unknown>): void {
  const contributions = Object.keys(extension).filter((key) => !BUNDLE_KEYS.has(key));

  if (contributions.length === 0) {
    return;
  }

  const names = contributions.map((key) => `"${key}"`).join(", ");

  throw new Error(
    `Extension "${extension.name}" declares "extensions" together with ${names}. ` +
      'Bundles may only declare "name" and "extensions"; move contributions into a bundled extension.',
  );
}
