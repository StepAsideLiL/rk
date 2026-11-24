import { defineExtension } from "../../core/types";
import { Bold } from "../bold/bold";
import { Document } from "../document/document";
import { Heading } from "../heading/heading";
import { Italic } from "../italic/italic";
import { Paragraph } from "../paragraph/paragraph";
import { Selection } from "../selection/selection";
import { EXTENSION_NAMES } from "../shared/schema";
import { Text } from "../text/text";

/**
 * Bundle of the default extension set.
 *
 * A bundle only groups other extensions. The manager expands it before schema
 * assembly, so installing `StarterKit()` is the same as installing document,
 * text, paragraph, heading, bold, italic and selection individually.
 */
export const StarterKit = defineExtension(() => ({
  name: EXTENSION_NAMES.starterKit,
  extensions: [Document(), Text(), Paragraph(), Heading({}), Bold(), Italic(), Selection()],
}));
