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
 * Bundle of every extension, used by the playground.
 *
 * Extensions are imported one by one so this bundle can include features that
 * are not part of {@link StarterKit}.
 */
export const PlaygroundKit = defineExtension(() => ({
  name: EXTENSION_NAMES.playgroundKit,
  extensions: [Document(), Text(), Paragraph(), Heading({}), Bold(), Italic(), Selection()],
}));
