import type { Element, ElementContent, Root, RootContent } from "hast";
import type { Options as SanitizeSchema } from "rehype-sanitize";
import type { Plugin } from "unified";

import type { Extension, HtmlAttributeDefinition } from "../core/types";

/** Strategy for elements outside the allowlist. */
export type UnknownElementStrategy = "unwrap" | "drop";

/**
 * Tags removed together with their contents.
 *
 * These are never safe in editor content: scripts, styles, embedded documents,
 * form controls and foreign SVG/MathML content. Extensions cannot opt back in.
 */
const STRIP_TAGS = Object.freeze([
  "base",
  "button",
  "embed",
  "form",
  "iframe",
  "input",
  "link",
  "math",
  "meta",
  "noscript",
  "object",
  "option",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
]);

/** URL protocols allowed unless an extension adds more. */
const BASE_PROTOCOLS = Object.freeze({
  href: ["http", "https", "mailto", "tel"],
  src: ["http", "https"],
} as const);

/** Attribute definition normalized to the sanitizer's mutable shape. */
type SanitizeAttribute = string | [string, ...string[]];

/**
 * Build a default-deny sanitizer schema from extension allowlists.
 *
 * Every top-level schema key is set explicitly because a missing key falls back
 * to the permissive GitHub-style default in `hast-util-sanitize`.
 */
export function buildSanitizeSchema(extensions: readonly Extension<unknown>[]): SanitizeSchema {
  const tagNames = new Set<string>();
  const attributes: Record<string, SanitizeAttribute[]> = {};
  const protocols: Record<string, string[]> = {
    href: [...BASE_PROTOCOLS.href],
    src: [...BASE_PROTOCOLS.src],
  };

  for (const extension of extensions) {
    const sanitize = extension.html?.sanitize;

    if (!sanitize) {
      continue;
    }

    for (const tagName of sanitize.tagNames ?? []) {
      tagNames.add(tagName.toLowerCase());
    }

    for (const [tagName, definitions] of Object.entries(sanitize.attributes ?? {})) {
      const key = tagName.toLowerCase();
      const bucket = attributes[key] ?? (attributes[key] = []);

      for (const definition of definitions) {
        const entry = normalizeAttribute(definition);
        const entryName = attributeName(entry);

        if (!bucket.some((candidate) => attributeName(candidate) === entryName)) {
          bucket.push(entry);
        }
      }
    }

    for (const [attribute, values] of Object.entries(sanitize.protocols ?? {})) {
      const bucket = protocols[attribute] ?? (protocols[attribute] = []);

      for (const value of values) {
        const protocol = value.toLowerCase();

        if (!bucket.includes(protocol)) {
          bucket.push(protocol);
        }
      }
    }
  }

  const stripped = new Set<string>(STRIP_TAGS);

  return {
    allowComments: false,
    allowDoctypes: false,
    ancestors: {},
    attributes,
    clobber: [],
    clobberPrefix: "",
    protocols,
    required: {},
    strip: [...STRIP_TAGS],
    tagNames: [...tagNames].filter((name) => !stripped.has(name)).sort(),
  };
}

/**
 * Drop elements outside the allowlist instead of unwrapping them.
 *
 * `hast-util-sanitize` unwraps unknown elements by default; this plugin adds
 * the opt-in drop behavior before the sanitizer runs.
 */
export function rehypeDropDisallowed(tagNames: readonly string[]): Plugin<[], Root> {
  const allowed = new Set(tagNames.map((name) => name.toLowerCase()));

  return function attacher() {
    return function transformer(tree: Root) {
      dropDisallowed(tree);
    };
  };

  function dropDisallowed(parent: Root | Element): void {
    const next: Array<RootContent | ElementContent> = [];

    for (const child of parent.children) {
      if (child.type === "element") {
        if (!allowed.has(child.tagName.toLowerCase())) {
          continue;
        }

        dropDisallowed(child);
      }

      next.push(child);
    }

    (parent as { children: Array<RootContent | ElementContent> }).children = next;
  }
}

/** Normalize an extension attribute definition for the sanitizer. */
function normalizeAttribute(definition: HtmlAttributeDefinition): SanitizeAttribute {
  if (typeof definition === "string") {
    return definition;
  }

  return [definition[0], ...(definition.slice(1) as string[])];
}

/** The attribute name from a sanitizer definition. */
function attributeName(definition: SanitizeAttribute): string {
  return typeof definition === "string" ? definition : definition[0];
}
