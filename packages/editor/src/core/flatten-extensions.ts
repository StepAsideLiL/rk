import type { Extension } from "./types";

/**
 * Fields a bundle may declare alongside `extensions`.
 *
 * A bundle only groups other extensions, so behavior fields would be silently
 * ignored. Rejecting them keeps that contract explicit.
 */
const BUNDLE_KEYS: ReadonlySet<string> = new Set(["name", "extensions", "options"]);

/**
 * Expand bundle extensions into a flat extension list.
 *
 * An extension that declares a non-empty `extensions` array is a bundle: its
 * only job is to group other extensions, so it is replaced by its children,
 * recursively. Flattening keeps schema assembly, dependency validation, plugin
 * ordering and sanitizer allowlists working from a single flat list.
 */
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

/** Throw when a bundle also tries to contribute behavior of its own. */
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
