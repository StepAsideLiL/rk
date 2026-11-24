export {
  CONTROLLED_UPDATE_META,
  Editor,
  type Autofocus,
  type BoundCommand,
  type BoundCommands,
  type CommandChain,
  type CoreExtensionOptions,
  type EditorContent,
  type EditorContentType,
  type EditorEvents,
  type EditorOptions,
  type GetTextOptions,
  type IsActiveTarget,
  type NodeOrMarkType,
  type TextDirection,
  type TextSerializer,
  type TextSerializerContext,
  type Unsubscribe,
} from "./editor";
export { ExtensionManager, type CollectedMarkdown } from "./core/extension-manager";
export * from "./core/types";
export {
  MarkdownCodec,
  type MarkdownCodecConfig,
  type MarkdownCodecOptions,
} from "./markdown/codec";
export * from "./markdown/marks";
export type { UnknownNodeStrategy } from "./markdown/types";

export const EDITOR_NAME = "@rk/editor";
