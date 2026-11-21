import type { Extension } from "../core/types";

import { Bold } from "./bold/bold";
import { Document } from "./document/document";
import { Heading } from "./heading/heading";
import { Italic } from "./italic/italic";
import { Paragraph } from "./paragraph/paragraph";
import { Selection } from "./selection/selection";
import { Text } from "./text/text";

export { Bold } from "./bold/bold";
export { Document } from "./document/document";
export { Heading, type HeadingOptions } from "./heading/heading";
export { Italic } from "./italic/italic";
export { Paragraph } from "./paragraph/paragraph";
export { Selection } from "./selection/selection";
export { Text } from "./text/text";
export {
  EXTENSION_NAMES,
  getMarkType,
  getNodeType,
  MARK_NAMES,
  NODE_NAMES,
  type MarkName,
  type NodeName,
} from "./shared/schema";

/**
 * The default extension set: document, text, paragraph, heading, bold, italic
 * and the inactive selection highlight, in schema order.
 */
export function starterKit(): readonly Extension<unknown>[] {
  return [Document(), Text(), Paragraph(), Heading({}), Bold(), Italic(), Selection()];
}
