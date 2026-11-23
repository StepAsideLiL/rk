export {
  CONTROLLED_UPDATE_META,
  type BoundCommand,
  type BoundCommands,
  type EditorContent,
  type EditorContentType,
  type EditorEvents,
  type EditorOptions,
  type Unsubscribe,
} from "./core/editor";
export { ExtensionManager, type CollectedMarkdown } from "./core/extension-manager";
export * from "./core/types";
export {
  MarkdownCodec,
  type MarkdownCodecConfig,
  type MarkdownCodecOptions,
} from "./markdown/codec";
export * from "./markdown/marks";
export type { UnknownNodeStrategy } from "./markdown/types";
export { Editor } from "./editor";

/** Human-readable package name. */
export const EDITOR_NAME = "@rk/editor";
